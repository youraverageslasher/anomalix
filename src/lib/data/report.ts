import { analyze, type AnalyzeOptions, type Analysis } from "./analyze";
import type { DataOrigin } from "./origin";
import { verdict, type Verdict } from "./verdict";
import { completeYears, fetchPower, fetchPowerExtremes, EXTREMES } from "./power";
import type { ExtremeFit } from "./daynight";
import { DEFAULT_VARIABLE, type VariableCode } from "./variables";
import { fetchGistemp } from "./gistemp";
import type { DataResult, Place } from "./types";
import { coverage, spanOf, type Coverage } from "./range";
import { partialMonthsFor } from "./monthlyCsv";
import { compareSlopes, isLinked, pearson, sameCell, type SlopeComparison } from "./pairCompare";

export interface CityReport {
  variable: VariableCode;
  months: { year: number; month: number; value: number }[];
  place: Place;
  cell: { lat: number; lon: number };
  elevation: number | null;
  analysis: Analysis;
  verdict: Verdict;
  /* What NASA POWER returned for this cell, partial years included. */
  coverage: Coverage | null;
  /* Valid months of an incomplete year after the last complete one (for the monthly export only; never in the analysis). */
  partialMonths?: { year: number; month: number; value: number }[];
  /* Temperature reports only: daily maximum and minimum, each with its own year range. */
  dayNight?: { ok: true; max: ExtremeFit; min: ExtremeFit } | { ok: false; error: string };
}

async function dayNightFor(lat: number, lon: number, opts: AnalyzeOptions): Promise<NonNullable<CityReport["dayNight"]>> {
  const r = await fetchPowerExtremes(lat, lon);
  if (!r.ok) return r;
  const fits: ExtremeFit[] = [];
  for (const code of EXTREMES) {
    const raw = r.data[code];
    const a = analyze(completeYears(raw), opts);
    if (!a.ok) return { ok: false, error: `${code}: ${a.error}` };
    fits.push({ code, coverage: coverage(raw), span: spanOf(a), trend: a.trend, verdict: verdict(a), annual: a.annual });
  }
  return { ok: true, max: fits[0], min: fits[1] };
}

export interface GlobalReport {
  variable: "T2M";
  months: { year: number; month: number; value: number }[];
  analysis: Analysis;
  verdict: Verdict;
  firstYear: number;
  lastYear: number;
  coverage: Coverage | null;
  /* Live GISTEMP file or the bundled snapshot. */
  origin?: DataOrigin;
}

/*
 * The single place analysis behind /report and /compare. onlyYears restricts the analysis to those years
 * (the compare view passes the years both places share); everything else is the same code path.
 */
export async function buildPlaceReport(
  place: Place,
  opts: AnalyzeOptions = {},
  variable: VariableCode = DEFAULT_VARIABLE,
  withDayNight = false,
  onlyYears?: ReadonlySet<number>,
): Promise<DataResult<CityReport>> {
  const [power, dayNight] = await Promise.all([
    fetchPower(place.lat, place.lon, variable),
    withDayNight && variable === "T2M" ? dayNightFor(place.lat, place.lon, opts) : Promise.resolve(undefined),
  ]);
  if (!power.ok) return power;
  const months = completeYears(power.data.months).filter((m) => !onlyYears || onlyYears.has(m.year));
  const analysis = analyze(months, opts);
  if (!analysis.ok) return analysis;
  const lastComplete = months.reduce((y, m) => Math.max(y, m.year), -Infinity);
  return {
    ok: true,
    data: {
      variable,
      place,
      cell: power.data.cell,
      elevation: power.data.elevation,
      analysis,
      verdict: verdict(analysis),
      coverage: coverage(power.data.months),
      ...(dayNight ? { dayNight } : {}),
      months: months.filter((m) => m.year >= analysis.startYear && m.year <= analysis.endYear),
      partialMonths: partialMonthsFor(power.data.months, lastComplete, analysis.endYear),
    },
  };
}

export async function globalReport(opts: AnalyzeOptions = {}): Promise<DataResult<GlobalReport>> {
  const g = await fetchGistemp();
  if (!g.ok) return g;
  const analysis = analyze(g.data.months, opts);
  if (!analysis.ok) return analysis;
  return {
    ok: true,
    data: {
      variable: "T2M",
      analysis,
      verdict: verdict(analysis),
      firstYear: g.data.firstYear,
      lastYear: g.data.lastYear,
      coverage: g.data.coverage,
      origin: g.data.origin,
      months: g.data.months.filter((m) => m.year >= analysis.startYear && m.year <= analysis.endYear),
    },
  };
}

export function cityReport(place: Place, opts: AnalyzeOptions = {}, variable: VariableCode = DEFAULT_VARIABLE, withDayNight = false): Promise<DataResult<CityReport>> {
  return buildPlaceReport(place, opts, variable, withDayNight);
}

export interface PlacePairReport {
  a: CityReport;
  b: CityReport;
  years: number[];
  comparison: SlopeComparison;
  r: number;
  linked: boolean;
}

export type PairResult = { ok: true; data: PlacePairReport } | { ok: false; error: string; code: "same-cell" | "too-short" | "data" };

/* Two places, same variable, period and season, analyzed on the years both have. */
export async function comparePlaces(a: Place, b: Place, opts: AnalyzeOptions = {}, variable: VariableCode = DEFAULT_VARIABLE): Promise<PairResult> {
  if (sameCell(a, b)) return { ok: false, code: "same-cell", error: "Both places fall in the same NASA POWER grid cell, so they share one data series. Pick a place farther away." };
  const [ra, rb] = await Promise.all([buildPlaceReport(a, opts, variable), buildPlaceReport(b, opts, variable)]);
  if (!ra.ok) return { ok: false, code: "data", error: `${a.name}: ${ra.error}` };
  if (!rb.ok) return { ok: false, code: "data", error: `${b.name}: ${rb.error}` };
  const yb = new Set(rb.data.analysis.annual.map((x) => x.year));
  const years = ra.data.analysis.annual.map((x) => x.year).filter((y) => yb.has(y));
  if (years.length < 10) return { ok: false, code: "too-short", error: "The two places share fewer than 10 complete years." };
  const common = new Set(years);
  const span = { ...opts, startYear: years[0], endYear: years[years.length - 1] };
  const [ca, cb] = await Promise.all([buildPlaceReport(a, span, variable, false, common), buildPlaceReport(b, span, variable, false, common)]);
  if (!ca.ok) return { ok: false, code: "data", error: `${a.name}: ${ca.error}` };
  if (!cb.ok) return { ok: false, code: "data", error: `${b.name}: ${cb.error}` };
  const ta = ca.data.analysis.trend;
  const tb = cb.data.analysis.trend;
  const comparison = compareSlopes({ perDecade: ta.perDecade, sePerDecade: ta.se * 10 }, { perDecade: tb.perDecade, sePerDecade: tb.se * 10 });
  const byYear = new Map(cb.data.analysis.anomalies.map((x) => [x.year, x.value]));
  const pairs = ca.data.analysis.anomalies.filter((x) => byYear.has(x.year));
  const r = pearson(
    pairs.map((x) => x.value),
    pairs.map((x) => byYear.get(x.year) as number),
  );
  return { ok: true, data: { a: ca.data, b: cb.data, years, comparison, r, linked: isLinked(r) } };
}

export async function compareCities(places: Place[], opts: AnalyzeOptions = {}, variable: VariableCode = DEFAULT_VARIABLE) {
  return Promise.all(places.map(async (place) => ({ place, result: await cityReport(place, opts, variable) })));
}

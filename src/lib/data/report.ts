import { analyze, type AnalyzeOptions, type Analysis } from "./analyze";
import type { DataOrigin } from "./origin";
import { verdict, type Verdict } from "./verdict";
import { completeYears, fetchPower, fetchPowerExtremes, EXTREMES } from "./power";
import type { ExtremeFit } from "./daynight";
import { DEFAULT_VARIABLE, type VariableCode } from "./variables";
import { fetchGistemp } from "./gistemp";
import type { DataResult, Place } from "./types";
import { coverage, spanOf, type Coverage } from "./range";

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

export async function cityReport(place: Place, opts: AnalyzeOptions = {}, variable: VariableCode = DEFAULT_VARIABLE, withDayNight = false): Promise<DataResult<CityReport>> {
  const [power, dayNight] = await Promise.all([
    fetchPower(place.lat, place.lon, variable),
    withDayNight && variable === "T2M" ? dayNightFor(place.lat, place.lon, opts) : Promise.resolve(undefined),
  ]);
  if (!power.ok) return power;
  const months = completeYears(power.data.months);
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
      partialMonths: power.data.months.filter((m) => m.year > lastComplete && analysis.endYear === lastComplete),
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

export async function compareCities(places: Place[], opts: AnalyzeOptions = {}, variable: VariableCode = DEFAULT_VARIABLE) {
  return Promise.all(places.map(async (place) => ({ place, result: await cityReport(place, opts, variable) })));
}

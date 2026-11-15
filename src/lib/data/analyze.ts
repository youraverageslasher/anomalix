import { mean } from "../stats";
import { tCdf, tQuantile } from "./tdist";
import { mannKendallTest, type MannKendallTest } from "./mannkendall";
import { acceleration, ar1Adjust, lag1 as lagOne, residualSd, type Acceleration } from "./rigor";
import type { MonthValue, Season } from "./types";

export const BASE_START = 1981;
export const BASE_END = 2010;
/* The fixed reference for anomalies and the seasonal cycle, a method choice, not a data period. */
export const BASELINE_LABEL = `${BASE_START}-${BASE_END}`;
export const MIN_YEARS = 10;
export const TOO_SHORT = "Series too short to test";

const SEASON_MONTHS: Record<Exclude<Season, "ALL">, number[]> = {
  DJF: [12, 1, 2],
  MAM: [3, 4, 5],
  JJA: [6, 7, 8],
  SON: [9, 10, 11],
};

export interface AnalyzeOptions {
  startYear?: number;
  endYear?: number;
  season?: Season;
}

export interface TrendFit {
  slopePerYear: number;
  intercept: number;
  se: number;
  df: number;
  tCrit: number;
  perDecade: number;
  ci95PerDecade: number;
  ciLow: number;
  ciHigh: number;
  /* Two sided p value of the regression slope (t test, n - 2 degrees of freedom). Not corrected for autocorrelation. */
  p: number;
  /* Lag 1 autocorrelation (r1) of the yearly residuals around the line. */
  lag1: number;
  /* p recomputed with the AR(1) effective sample size, and that size. */
  pAdj: number;
  nEff: number;
  /* Standard deviation of the residuals around the line, in the variable's unit. */
  residualSd: number;
}

export interface Analysis {
  ok: true;
  startYear: number;
  endYear: number;
  season: Season;
  annual: { year: number; value: number }[];
  anomalies: { year: number; value: number }[];
  baseline: number;
  trend: TrendFit;
  totalChange: number;
  mk: MannKendallTest;
  /* Last 15 points against the full series; null when the series is not longer than that. */
  acceleration: Acceleration | null;
  climatology: number[];
  residual: { t: number; value: number }[];
  monthsUsed: number;
}

export type AnalysisResult = Analysis | { ok: false; error: string };

export function olsT(xs: number[], ys: number[]): TrendFit {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let ssr = 0;
  for (let i = 0; i < n; i++) ssr += (ys[i] - intercept - slope * xs[i]) ** 2;
  const df = n - 2;
  const se = Math.sqrt(ssr / df) / Math.sqrt(sxx);
  const tCrit = tQuantile(0.975, df);
  const perDecade = slope * 10;
  const ci95PerDecade = tCrit * se * 10;
  const tStat = se > 0 ? slope / se : slope === 0 ? 0 : Infinity;
  const p = Number.isFinite(tStat) ? Math.min(1, 2 * (1 - tCdf(Math.abs(tStat), df))) : 0;
  const res = ys.map((y, i) => y - intercept - slope * xs[i]);
  const lag1 = lagOne(res);
  const adj = ar1Adjust(slope, se, n, lag1);
  return {
    slopePerYear: slope,
    intercept,
    se,
    df,
    tCrit,
    perDecade,
    ci95PerDecade,
    ciLow: perDecade - ci95PerDecade,
    ciHigh: perDecade + ci95PerDecade,
    p,
    lag1,
    pAdj: adj.pAdj,
    nEff: adj.nEff,
    residualSd: residualSd(res),
  };
}

export function periodMeans(
  months: MonthValue[],
  season: Season,
  startYear: number,
  endYear: number,
): { year: number; value: number }[] {
  const byKey = new Map<string, number>();
  for (const m of months) if (Number.isFinite(m.value)) byKey.set(`${m.year}-${m.month}`, m.value);
  const out: { year: number; value: number }[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const keys =
      season === "ALL"
        ? Array.from({ length: 12 }, (_, i) => `${y}-${i + 1}`)
        : SEASON_MONTHS[season].map((mo) => (mo === 12 && season === "DJF" ? `${y - 1}-12` : `${y}-${mo}`));
    const vals = keys.map((k) => byKey.get(k));
    if (vals.every((v): v is number => v !== undefined)) out.push({ year: y, value: mean(vals) });
  }
  return out;
}

export function climatology(months: MonthValue[]): number[] {
  const buckets: number[][] = Array.from({ length: 12 }, () => []);
  for (const m of months) {
    if (Number.isFinite(m.value) && m.year >= BASE_START && m.year <= BASE_END) buckets[m.month - 1].push(m.value);
  }
  return buckets.map((b) => (b.length ? mean(b) : NaN));
}

export function analyze(months: MonthValue[], opts: AnalyzeOptions = {}): AnalysisResult {
  const years = months.filter((m) => Number.isFinite(m.value)).map((m) => m.year);
  const startYear = opts.startYear ?? (years.length ? Math.min(...years) : NaN);
  const endYear = opts.endYear ?? (years.length ? Math.max(...years) : NaN);
  const season = opts.season ?? "ALL";
  if (endYear - startYear + 1 < MIN_YEARS) return { ok: false, error: TOO_SHORT };

  const annual = periodMeans(months, season, startYear, endYear);
  if (annual.length < MIN_YEARS) return { ok: false, error: TOO_SHORT };

  const xs = annual.map((a) => a.year);
  const ys = annual.map((a) => a.value);
  const trend = olsT(xs, ys);
  const mk = mannKendallTest(xs, ys);

  const base = periodMeans(months, season, BASE_START, BASE_END).map((a) => a.value);
  const baseline = base.length ? mean(base) : NaN;
  const anomalies = annual.map((a) => ({ year: a.year, value: a.value - baseline }));

  const clim = climatology(months);
  const inPeriod = months.filter(
    (m) => Number.isFinite(m.value) && m.year >= startYear && m.year <= endYear && Number.isFinite(clim[m.month - 1]),
  );
  const ts = inPeriod.map((m) => m.year + (m.month - 0.5) / 12);
  const deseason = inPeriod.map((m) => m.value - clim[m.month - 1]);
  const fit = ts.length >= 3 ? olsT(ts, deseason) : null;
  const residual = fit
    ? inPeriod.map((_, i) => ({ t: ts[i], value: deseason[i] - (fit.intercept + fit.slopePerYear * ts[i]) }))
    : [];

  return {
    ok: true,
    startYear,
    endYear,
    season,
    annual,
    anomalies,
    baseline,
    trend,
    totalChange: trend.slopePerYear * (xs[xs.length - 1] - xs[0]),
    mk,
    acceleration: acceleration(annual, trend.perDecade),
    climatology: clim,
    residual,
    monthsUsed: inPeriod.length,
  };
}

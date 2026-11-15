import { mean } from "../stats";
import { MIN_YEARS, olsT, type TrendFit } from "./analyze";
import { mannKendallTest, type MannKendallTest } from "./mannkendall";
import { verdict, type Verdict } from "./verdict";

export interface YearValue {
  year: number;
  value: number;
}

/* Slopes need no baseline. For drawing, both series are shown as anomalies against one common
   reference period: their own mean over all the years they share. */
export interface Baseline {
  from: number;
  to: number;
  years: number;
}

export interface SourceFit {
  anomalies: YearValue[];
  mean: number;
  trend: TrendFit;
  mk: MannKendallTest;
  verdict: Verdict;
}

export interface TwoSources {
  years: number[];
  baseline: Baseline;
  local: SourceFit;
  global: SourceFit;
}

export type Agreement =
  | { kind: "same"; direction: "rising" | "falling"; ratio: number | null }
  | { kind: "none"; reason: "opposite" | "inconclusive" };

function finiteOnly(series: YearValue[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const p of series) if (Number.isInteger(p.year) && Number.isFinite(p.value)) m.set(p.year, p.value);
  return m;
}

function fit(years: number[], values: number[], base: Baseline): SourceFit {
  const inBase = values.filter((_, i) => years[i] >= base.from && years[i] <= base.to);
  const m = mean(inBase);
  const anomalies = years.map((year, i) => ({ year, value: values[i] - m }));
  const trend = olsT(years, values);
  const mk = mannKendallTest(years, values);
  return { anomalies, mean: m, trend, mk, verdict: verdict({ trend, mk }) };
}

/* Keeps the years both series have, picks one baseline for both, and runs the same tests on each. */
export function alignTwoSources(local: YearValue[], global: YearValue[]): TwoSources | null {
  const a = finiteOnly(local);
  const b = finiteOnly(global);
  const years = [...a.keys()].filter((y) => b.has(y)).sort((x, y) => x - y);
  if (years.length < MIN_YEARS) return null;
  const base: Baseline = { from: years[0], to: years[years.length - 1], years: years.length };
  return {
    years,
    baseline: base,
    local: fit(years, years.map((y) => a.get(y) as number), base),
    global: fit(years, years.map((y) => b.get(y) as number), base),
  };
}

export function isSignificant(v: Verdict): boolean {
  return v.confidence !== "Inconclusive";
}

/* "about 2.4": the ratio is shown to one decimal and always as an approximation. */
export const aboutRatio = (r: number) => `about ${r.toFixed(1)}`;

/* The ratio exists only when the local trend is significant and both series point the same way, on the same years. */
export function agreement(local: SourceFit, global: SourceFit): Agreement {
  if (!isSignificant(local.verdict) || !isSignificant(global.verdict)) return { kind: "none", reason: "inconclusive" };
  const ls = Math.sign(local.trend.perDecade);
  const gs = Math.sign(global.trend.perDecade);
  if (ls === 0 || ls !== gs) return { kind: "none", reason: "opposite" };
  const ratio = global.trend.perDecade !== 0 ? local.trend.perDecade / global.trend.perDecade : null;
  return { kind: "same", direction: ls > 0 ? "rising" : "falling", ratio };
}

import { olsT, type TrendFit } from "./analyze";
import { mannKendallTest, type MannKendallTest } from "./mannkendall";
import { verdict, type Verdict } from "./verdict";
import type { MonthValue } from "./types";

/* Calendar year quarters labeled by months. Dec to Feb takes January, February and December of the SAME year. */
export const QUARTERS = [
  { id: "DJF", label: "Dec to Feb", months: [12, 1, 2] },
  { id: "MAM", label: "Mar to May", months: [3, 4, 5] },
  { id: "JJA", label: "Jun to Aug", months: [6, 7, 8] },
  { id: "SON", label: "Sep to Nov", months: [9, 10, 11] },
] as const;

export const BONFERRONI_P = 0.05 / QUARTERS.length;

export interface SeasonFit {
  id: (typeof QUARTERS)[number]["id"];
  label: string;
  series: { year: number; value: number }[];
  trend: TrendFit;
  mk: MannKendallTest;
  verdict: Verdict;
  /* Passes the conservative rule and Bonferroni on both the plain and the adjusted p. */
  strict: boolean;
}

export function quarterMeans(months: MonthValue[], q: readonly number[]): { year: number; value: number }[] {
  const by = new Map<string, number>();
  const years = new Set<number>();
  for (const m of months) {
    if (!Number.isFinite(m.value)) continue;
    by.set(`${m.year}-${m.month}`, m.value);
    years.add(m.year);
  }
  return [...years]
    .sort((a, b) => a - b)
    .flatMap((y) => {
      const v = q.map((mo) => by.get(`${y}-${mo}`));
      return v.every((x): x is number => x !== undefined) ? [{ year: y, value: v.reduce((s, x) => s + x, 0) / v.length }] : [];
    });
}

export function seasonFits(months: MonthValue[], minYears = 10): SeasonFit[] | null {
  const out: SeasonFit[] = [];
  for (const q of QUARTERS) {
    const series = quarterMeans(months, q.months);
    if (series.length < minYears) return null;
    const xs = series.map((p) => p.year);
    const ys = series.map((p) => p.value);
    const trend = olsT(xs, ys);
    const mk = mannKendallTest(xs, ys);
    const v = verdict({ trend, mk });
    out.push({ id: q.id, label: q.label, series, trend, mk, verdict: v, strict: v.confidence !== "Inconclusive" && trend.p < BONFERRONI_P && trend.pAdj < BONFERRONI_P });
  }
  return out;
}

/* The season with the largest slope among the strictly significant ones; null when none passes. */
export function pullingSeason(fits: SeasonFit[]): SeasonFit | null {
  const ok = fits.filter((f) => f.strict);
  if (!ok.length) return null;
  return ok.reduce((a, b) => (b.trend.perDecade > a.trend.perDecade ? b : a));
}

import { olsT, type TrendFit } from "./analyze";
import { mannKendallTest } from "./mannkendall";
import { verdict } from "./verdict";

export const WINDOW_YEARS = 25;
export const MIN_SERIES_YEARS = 35;
export const MAJORITY = 0.8;

export interface WindowFit {
  from: number;
  to: number;
  trend: TrendFit;
  /* Same conservative rule as the headline: OLS, Mann-Kendall, Theil-Sen and the AR(1) adjusted p must agree. */
  significant: boolean;
  sign: 1 | -1 | 0;
}

/* Every rolling 25 point window of a yearly series; null when the series has fewer than 35 points. */
export function rollingWindows(series: { year: number; value: number }[], size = WINDOW_YEARS, minYears = MIN_SERIES_YEARS): WindowFit[] | null {
  if (series.length < minYears) return null;
  const out: WindowFit[] = [];
  for (let i = 0; i + size <= series.length; i++) {
    const w = series.slice(i, i + size);
    const xs = w.map((p) => p.year);
    const ys = w.map((p) => p.value);
    const trend = olsT(xs, ys);
    const v = verdict({ trend, mk: mannKendallTest(xs, ys) });
    out.push({ from: xs[0], to: xs[xs.length - 1], trend, significant: v.confidence !== "Inconclusive", sign: trend.perDecade > 0 ? 1 : trend.perDecade < 0 ? -1 : 0 });
  }
  return out;
}

export type WindowStory =
  | { kind: "robust"; k: number; n: number; direction: 1 | -1 }
  | { kind: "flips"; m: number; n: number }
  | { kind: "count"; k: number; n: number; up: number; down: number };

/*
 * "robust" only when the whole series is significant and at least 80 percent of the windows are significant in the
 * same direction; "flips" only when the series is Inconclusive and the window slopes change sign; otherwise a count.
 */
export function windowStory(windows: WindowFit[], seriesSignificant: boolean, seriesSign: 1 | -1 | 0): WindowStory {
  const n = windows.length;
  const up = windows.filter((w) => w.sign > 0).length;
  const down = windows.filter((w) => w.sign < 0).length;
  if (seriesSignificant && seriesSign !== 0) {
    const k = windows.filter((w) => w.significant && w.sign === seriesSign).length;
    if (k >= MAJORITY * n) return { kind: "robust", k, n, direction: seriesSign };
  }
  if (!seriesSignificant && up > 0 && down > 0) {
    const base = seriesSign >= 0 ? 1 : -1;
    return { kind: "flips", m: windows.filter((w) => w.sign === -base).length, n };
  }
  return { kind: "count", k: windows.filter((w) => w.significant).length, n, up, down };
}

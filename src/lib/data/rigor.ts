import { tCdf, tQuantile } from "./tdist";

/*
 * Extra rigor around the OLS trend. None of it changes how a seal is earned; it can only make the verdict more
 * cautious (see verdict.ts).
 */

export const MIN_NEFF = 5;
export const ACCEL_YEARS = 15;

export interface Ar1 {
  r1: number;
  n: number;
  nEff: number;
  seAdj: number;
  dfAdj: number;
  pAdj: number;
}

/* Lag 1 autocorrelation of a residual series. */
export function lag1(res: number[]): number {
  let num = 0;
  let den = 0;
  for (let i = 0; i < res.length; i++) {
    den += res[i] ** 2;
    if (i > 0) num += res[i] * res[i - 1];
  }
  return den > 0 ? num / den : 0;
}

/*
 * AR(1) adjustment: with positive r1, N_eff = N(1 - r1)/(1 + r1), floored at 5. The slope standard error is
 * scaled by sqrt((N - 2)/(N_eff - 2)) and p is recomputed with N_eff - 2 degrees of freedom.
 */
export function ar1Adjust(slope: number, se: number, n: number, r1: number): Ar1 {
  const nEff = r1 > 0 ? Math.max(MIN_NEFF, (n * (1 - r1)) / (1 + r1)) : n;
  const dfAdj = nEff - 2;
  const seAdj = se * Math.sqrt((n - 2) / dfAdj);
  const t = seAdj > 0 ? slope / seAdj : slope === 0 ? 0 : Infinity;
  const pAdj = Number.isFinite(t) ? Math.min(1, 2 * (1 - tCdf(Math.abs(t), dfAdj))) : 0;
  return { r1, n, nEff, seAdj, dfAdj, pAdj };
}

/* Standard deviation of the residuals around the line, with n - 2 degrees of freedom. */
export function residualSd(res: number[]): number {
  const df = res.length - 2;
  return df > 0 ? Math.sqrt(res.reduce((s, r) => s + r * r, 0) / df) : NaN;
}

export interface SimpleFit {
  perDecade: number;
  halfWidth: number;
}

function fitPerDecade(xs: number[], ys: number[]): SimpleFit {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
  }
  const b = sxy / sxx;
  const a = my - b * mx;
  let ssr = 0;
  for (let i = 0; i < n; i++) ssr += (ys[i] - a - b * xs[i]) ** 2;
  const se = Math.sqrt(ssr / (n - 2) / sxx);
  return { perDecade: b * 10, halfWidth: tQuantile(0.975, n - 2) * se * 10 };
}

export type Pace = "accelerating" | "slowing" | "steady";

export interface Acceleration {
  pace: Pace;
  years: number;
  from: number;
  to: number;
  recent: SimpleFit;
  full: number;
}

/*
 * Slope of the last 15 points against the full series. "accelerating" only when the recent slope exceeds the full
 * slope by more than the recent interval half width; "slowing" in the mirror case; otherwise "steady".
 * Needs more points than the window, or it returns null.
 */
export function acceleration(series: { year: number; value: number }[], fullPerDecade: number, years = ACCEL_YEARS): Acceleration | null {
  if (series.length <= years) return null;
  const tail = series.slice(-years);
  const recent = fitPerDecade(
    tail.map((p) => p.year),
    tail.map((p) => p.value),
  );
  const diff = recent.perDecade - fullPerDecade;
  const pace: Pace = diff > recent.halfWidth ? "accelerating" : -diff > recent.halfWidth ? "slowing" : "steady";
  return { pace, years, from: tail[0].year, to: tail[tail.length - 1].year, recent, full: fullPerDecade };
}

/* Theil-Sen agrees with OLS when it has the same sign and sits inside the OLS 95% interval. */
export function theilSenAgrees(theilSenPerDecade: number, olsPerDecade: number, ciLow: number, ciHigh: number): boolean {
  const sameSign = Math.sign(theilSenPerDecade) === Math.sign(olsPerDecade);
  return sameSign && theilSenPerDecade >= ciLow && theilSenPerDecade <= ciHigh;
}

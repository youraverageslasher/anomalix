import { olsT, type TrendFit } from "./analyze";
import { tQuantile } from "./tdist";

export const MIN_SCALING_YEARS = 25;

export interface Scaling {
  years: number[];
  /* Anomalies against each series' own mean over all the shared years. */
  x: number[];
  y: number[];
  reference: { from: number; to: number };
  /* Local °C per 1 °C of global change, with its 95% half width, plain p and AR(1) adjusted p. */
  beta: number;
  betaHalf: number;
  fit: TrendFit;
  r2: number;
  /* Correlation of the two series after each is detrended against time. */
  detrendedR: number;
  band: { x: number; lo: number; hi: number }[];
  movesWith: boolean;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sab += (a[i] - ma) * (b[i] - mb);
    saa += (a[i] - ma) ** 2;
    sbb += (b[i] - mb) ** 2;
  }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : NaN;
}

function detrend(years: number[], v: number[]): number[] {
  const f = olsT(years, v);
  return v.map((y, i) => y - f.intercept - f.slopePerYear * years[i]);
}

/* Regression of local on global anomalies over the common complete years; null below 25 shared years. */
export function patternScaling(local: { year: number; value: number }[], global: { year: number; value: number }[], minYears = MIN_SCALING_YEARS): Scaling | null {
  const g = new Map(global.filter((p) => Number.isFinite(p.value)).map((p) => [p.year, p.value]));
  const pairs = local.filter((p) => Number.isFinite(p.value) && g.has(p.year)).sort((a, b) => a.year - b.year);
  if (pairs.length < minYears) return null;
  const years = pairs.map((p) => p.year);
  const lr = pairs.map((p) => p.value);
  const gr = pairs.map((p) => g.get(p.year) as number);
  const ml = lr.reduce((s, v) => s + v, 0) / lr.length;
  const mg = gr.reduce((s, v) => s + v, 0) / gr.length;
  const y = lr.map((v) => v - ml);
  const x = gr.map((v) => v - mg);
  /* olsT reports per decade (slope times 10); here the slope itself is the scaling factor. Residual order follows the years, so lag 1 is in time. */
  const fit = olsT(x, y);
  const beta = fit.slopePerYear;
  const betaHalf = fit.ci95PerDecade / 10;
  const r = pearson(x, y);
  const n = x.length;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const sxx = x.reduce((s, v) => s + (v - mx) ** 2, 0);
  const t = tQuantile(0.975, n - 2);
  const xmin = Math.min(...x);
  const xmax = Math.max(...x);
  const band = Array.from({ length: 41 }, (_, i) => {
    const xv = xmin + ((xmax - xmin) * i) / 40;
    const yhat = fit.intercept + beta * xv;
    const h = t * fit.residualSd * Math.sqrt(1 / n + (xv - mx) ** 2 / sxx);
    return { x: xv, lo: yhat - h, hi: yhat + h };
  });
  return {
    years,
    x,
    y,
    reference: { from: years[0], to: years[years.length - 1] },
    beta,
    betaHalf,
    fit,
    r2: r * r,
    detrendedR: pearson(detrend(years, lr), detrend(years, gr)),
    band,
    movesWith: beta - betaHalf > 0 && fit.pAdj < 0.05,
  };
}

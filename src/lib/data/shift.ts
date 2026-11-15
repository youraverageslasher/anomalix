import { normalCdf } from "../stats";

export const SHIFT_YEARS = 15;

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  if (!n) return NaN;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

/* Percentile with linear interpolation between order statistics (type 7). */
export function percentile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return NaN;
  const h = (s.length - 1) * q;
  const lo = Math.floor(h);
  return s[lo] + (h - lo) * ((s[Math.min(lo + 1, s.length - 1)] ?? s[lo]) - s[lo]);
}

export interface MannWhitney {
  u: number;
  z: number;
  p: number;
}

/* Two sided Mann-Whitney U with the normal approximation, tie corrected, continuity corrected. */
export function mannWhitney(a: number[], b: number[]): MannWhitney {
  const n1 = a.length;
  const n2 = b.length;
  const all = [...a.map((v) => ({ v, g: 0 })), ...b.map((v) => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);
  const ranks = new Array(all.length).fill(0);
  let tie = 0;
  for (let i = 0; i < all.length; ) {
    let j = i;
    while (j + 1 < all.length && all[j + 1].v === all[i].v) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[k] = r;
    const t = j - i + 1;
    if (t > 1) tie += t ** 3 - t;
    i = j + 1;
  }
  const r1 = all.reduce((s, x, i) => s + (x.g === 0 ? ranks[i] : 0), 0);
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const n = n1 + n2;
  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt(((n1 * n2) / 12) * (n + 1 - tie / (n * (n - 1))));
  const diff = u1 - mu;
  const z = sigma > 0 ? (Math.abs(diff) - 0.5 > 0 ? Math.sign(diff) * (Math.abs(diff) - 0.5) / sigma : 0) : 0;
  return { u: u1, z, p: Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))) };
}

/* Gaussian kernel density on a grid, Silverman bandwidth from the pooled sample. */
export function bandwidth(xs: number[]): number {
  const n = xs.length;
  const m = xs.reduce((s, x) => s + x, 0) / n;
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1));
  const iqr = percentile(xs, 0.75) - percentile(xs, 0.25);
  const spread = Math.min(sd, iqr / 1.34) || sd || 1;
  return 0.9 * spread * Math.pow(n, -1 / 5);
}

export function kde(xs: number[], grid: number[], h: number): number[] {
  const c = 1 / (xs.length * h * Math.sqrt(2 * Math.PI));
  return grid.map((g) => c * xs.reduce((s, x) => s + Math.exp(-0.5 * ((g - x) / h) ** 2), 0));
}

export interface Shift {
  early: { year: number; value: number }[];
  late: { year: number; value: number }[];
  test: MannWhitney;
  medianEarly: number;
  medianLate: number;
  p90Early: number;
  aboveP90: number;
  rose: boolean;
}

/* First and last fifteen yearly values; null when the two windows would overlap. */
export function highsShift(series: { year: number; value: number }[], n = SHIFT_YEARS): Shift | null {
  if (series.length < 2 * n) return null;
  const early = series.slice(0, n);
  const late = series.slice(-n);
  const e = early.map((p) => p.value);
  const l = late.map((p) => p.value);
  const p90Early = percentile(e, 0.9);
  const medianEarly = median(e);
  const medianLate = median(l);
  return { early, late, test: mannWhitney(l, e), medianEarly, medianLate, p90Early, aboveP90: l.filter((v) => v > p90Early).length, rose: medianLate > medianEarly };
}

export interface MonthlyPoint {
  year: number;
  month: number;
  value: number;
}

export interface YearValue {
  year: number;
  value: number;
}

export interface OlsResult {
  slope: number;
  intercept: number;
  se: number;
  ci95: number;
  n: number;
  r2: number;
}

export const BASE_START = 1981;
export const BASE_END = 2010;

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  let t = 0;
  for (const x of xs) t += x;
  return t / xs.length;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function annualMeans(series: MonthlyPoint[]): YearValue[] {
  const byYear = new Map<number, number[]>();
  for (const p of series) {
    if (!Number.isFinite(p.value)) continue;
    const arr = byYear.get(p.year) ?? [];
    arr.push(p.value);
    byYear.set(p.year, arr);
  }
  const out: YearValue[] = [];
  for (const [year, vals] of byYear) {
    if (vals.length === 12) out.push({ year, value: mean(vals) });
  }
  return out.sort((a, b) => a.year - b.year);
}

export function annualAnomalies(
  annual: YearValue[],
  baseStart = BASE_START,
  baseEnd = BASE_END,
): { anomalies: YearValue[]; baseline: number } {
  const base = annual.filter((a) => a.year >= baseStart && a.year <= baseEnd).map((a) => a.value);
  const baseline = mean(base);
  return {
    baseline,
    anomalies: annual.map((a) => ({ year: a.year, value: a.value - baseline })),
  };
}

export function ols(xs: number[], ys: number[]): OlsResult {
  const n = xs.length;
  if (n < 3 || ys.length !== n) {
    return { slope: NaN, intercept: NaN, se: NaN, ci95: NaN, n, r2: NaN };
  }
  const mx = mean(xs);
  const my = mean(ys);
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let ssr = 0;
  for (let i = 0; i < n; i++) {
    const r = ys[i] - (intercept + slope * xs[i]);
    ssr += r * r;
  }
  const s = Math.sqrt(ssr / (n - 2));
  const se = s / Math.sqrt(sxx);
  return { slope, intercept, se, ci95: 1.96 * se, n, r2: syy > 0 ? 1 - ssr / syy : NaN };
}

export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const poly =
    t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-(z * z) / 2);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

export function senSlope(xs: number[], ys: number[]): number {
  const slopes: number[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = i + 1; j < xs.length; j++) {
      if (xs[j] !== xs[i]) slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
    }
  }
  return median(slopes);
}

export function movingAverage(values: number[], window = 12): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  let count = 0;
  const q: number[] = [];
  for (const v of values) {
    q.push(v);
    if (Number.isFinite(v)) {
      sum += v;
      count++;
    }
    if (q.length > window) {
      const old = q.shift() as number;
      if (Number.isFinite(old)) {
        sum -= old;
        count--;
      }
    }
    out.push(q.length === window && count === window ? sum / window : null);
  }
  return out;
}

export function monthlyClimatology(
  series: MonthlyPoint[],
  baseStart = BASE_START,
  baseEnd = BASE_END,
): number[] {
  const buckets: number[][] = Array.from({ length: 12 }, () => []);
  for (const p of series) {
    if (!Number.isFinite(p.value) || p.year < baseStart || p.year > baseEnd) continue;
    buckets[p.month - 1].push(p.value);
  }
  return buckets.map((b) => mean(b));
}

export function monthlyAnomalies(series: MonthlyPoint[], climatology: number[]): MonthlyPoint[] {
  return series.map((p) => ({ ...p, value: p.value - climatology[p.month - 1] }));
}

export interface Decomposition {
  climatology: number[];
  residual: { t: number; value: number }[];
  trendPerYear: number;
}

export function decompose(series: MonthlyPoint[]): Decomposition {
  const climatology = monthlyClimatology(series);
  const valid = series.filter((p) => Number.isFinite(p.value));
  const ts = valid.map((p) => p.year + (p.month - 0.5) / 12);
  const deseason = valid.map((p) => p.value - climatology[p.month - 1]);
  const fit = ols(ts, deseason);
  const residual = valid.map((_, i) => ({
    t: ts[i],
    value: deseason[i] - (fit.intercept + fit.slope * ts[i]),
  }));
  return { climatology, residual, trendPerYear: fit.slope };
}

import { normalCdf, senSlope } from "../stats";

export interface MannKendallTest {
  n: number;
  s: number;
  variance: number;
  z: number;
  p: number;
  senPerYear: number;
  senPerDecade: number;
}

/*
 * Mann-Kendall trend test on one series ordered in time.
 * S counts later-minus-earlier signs; the variance carries the tie correction;
 * Z uses the normal approximation with a continuity correction of 1; p is two sided.
 * Sen's slope is the median of all pairwise slopes, reported per decade.
 */
export function mannKendallTest(xs: number[], ys: number[]): MannKendallTest {
  const n = ys.length;
  let s = 0;
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = ys[j] - ys[i];
      if (d > 0) s += 1;
      else if (d < 0) s -= 1;
    }
  }
  const counts = new Map<number, number>();
  for (const y of ys) counts.set(y, (counts.get(y) ?? 0) + 1);
  let tieTerm = 0;
  for (const t of counts.values()) if (t > 1) tieTerm += t * (t - 1) * (2 * t + 5);
  const variance = (n * (n - 1) * (2 * n + 5) - tieTerm) / 18;
  let z = 0;
  if (variance > 0) {
    if (s > 0) z = (s - 1) / Math.sqrt(variance);
    else if (s < 0) z = (s + 1) / Math.sqrt(variance);
  }
  const p = z === 0 ? 1 : Math.min(1, 2 * (1 - normalCdf(Math.abs(z))));
  const senPerYear = n >= 2 ? senSlope(xs, ys) : NaN;
  return { n, s, variance, z, p, senPerYear, senPerDecade: senPerYear * 10 };
}

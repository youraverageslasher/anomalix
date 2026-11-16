import { normalCdf } from "../stats";
import { powerCell } from "./power";

/* Correlation at or above this marks two places as climatically linked: the z test assumes independence, which may not hold. */
export const LINK_R = 0.5;
export const Z95 = 1.96;

export interface SlopeInput {
  perDecade: number;
  /* Standard error of the slope, per decade (not the 95% half width). */
  sePerDecade: number;
}

export interface SlopeComparison {
  delta: number;
  seDelta: number;
  z: number;
  p: number;
  half95: number;
  significant: boolean;
}

/* Difference of two independent slopes: delta = a - b, SE = sqrt(seA^2 + seB^2), z = delta / SE, two-tailed normal p. */
export function compareSlopes(a: SlopeInput, b: SlopeInput): SlopeComparison {
  const delta = a.perDecade - b.perDecade;
  const seDelta = Math.sqrt(a.sePerDecade ** 2 + b.sePerDecade ** 2);
  const z = seDelta > 0 ? delta / seDelta : delta === 0 ? 0 : Infinity;
  const p = Number.isFinite(z) ? Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))) : 0;
  return { delta, seDelta, z, p, half95: Z95 * seDelta, significant: p < 0.05 };
}

/* Pearson correlation of two equally long series. */
export function pearson(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return NaN;
  const mx = xs.slice(0, n).reduce((s, v) => s + v, 0) / n;
  const my = ys.slice(0, n).reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
}

export function isLinked(r: number): boolean {
  return Number.isFinite(r) && r >= LINK_R;
}

export function linkWarning(r: number): string {
  return `These places are climatically linked (r = ${r.toFixed(2)}). The independence assumption may not hold, so treat this comparison's p value and interval cautiously.`;
}

/* Same NASA POWER grid cell (0.5 by 0.625 degrees): comparing would compare a series with itself. */
export function sameCell(a: { lat: number; lon: number }, b: { lat: number; lon: number }): boolean {
  const ca = powerCell(a.lat, a.lon);
  const cb = powerCell(b.lat, b.lon);
  return ca.lat === cb.lat && ca.lon === cb.lon;
}

/* "lat,lon,name"; the name may itself contain commas. */
export function parsePlaceParam(s: string | null): { lat: number; lon: number; name: string } | null {
  if (!s) return null;
  const parts = s.split(",");
  if (parts.length < 2) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const name = parts.slice(2).join(",").trim().slice(0, 80);
  return { lat, lon, name: name || `${lat.toFixed(2)}, ${lon.toFixed(2)}` };
}

export function placeParam(p: { lat: number; lon: number; name: string }): string {
  return `${p.lat.toFixed(4)},${p.lon.toFixed(4)},${p.name}`;
}

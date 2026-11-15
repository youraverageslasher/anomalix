import type { MonthValue } from "./types";

export const WORLDVIEW = "https://worldview.earthdata.nasa.gov/";
/*
 * Layer ids and start date read from Worldview's own configuration (worldview.earthdata.nasa.gov/config/wv.json,
 * checked 15 Nov 2026): MODIS_Terra_CorrectedReflectance_TrueColor starts 2000-02-24; the coastline overlay id is
 * Coastlines_15m (a plain "Coastlines" is rewritten to it by Worldview).
 */
export const TRUE_COLOR = "MODIS_Terra_CorrectedReflectance_TrueColor";
export const COASTLINES = "Coastlines_15m";
export const LAYER_START = "2000-02-24";
export const PAD_DEG = 1.5;
export const IMAGE_DAY = 15;
/* True color needs sunlight: the noon sun must stand at least this high on the image day (polar night is skipped). */
export const MIN_SUN_DEG = 10;

/* Noon solar elevation in degrees, from the usual declination approximation. */
export function noonSunElevation(lat: number, year: number, month: number, day: number): number {
  const doy = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000);
  const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (284 + doy));
  return 90 - Math.abs(lat - decl);
}

export interface HotMonth {
  year: number;
  month: number;
  anomaly: number;
  date: string;
}

/* The month with the largest positive anomaly against that calendar month's own mean, on or after the imagery start, with daylight at the place. */
export function hottestMonth(months: MonthValue[], start = LAYER_START, lat: number | null = null): HotMonth | null {
  const [sy] = start.split("-").map(Number);
  const firstYear = Math.max(2000, sy);
  const sums = new Map<number, [number, number]>();
  for (const m of months) {
    if (!Number.isFinite(m.value) || m.month < 1 || m.month > 12) continue;
    const s = sums.get(m.month) ?? [0, 0];
    s[0] += m.value;
    s[1]++;
    sums.set(m.month, s);
  }
  let best: HotMonth | null = null;
  for (const m of months) {
    if (!Number.isFinite(m.value) || m.year < firstYear) continue;
    const date = `${m.year}-${String(m.month).padStart(2, "0")}-${String(IMAGE_DAY).padStart(2, "0")}`;
    if (date < start) continue;
    if (lat !== null && noonSunElevation(lat, m.year, m.month, IMAGE_DAY) < MIN_SUN_DEG) continue;
    const s = sums.get(m.month);
    if (!s) continue;
    const anomaly = m.value - s[0] / s[1];
    if (anomaly > 0 && (!best || anomaly > best.anomaly)) best = { year: m.year, month: m.month, anomaly, date };
  }
  return best;
}

export function validCoords(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

/* Official URL parameters: v=minLon,minLat,maxLon,maxLat, t=YYYY-MM-DD, l=layer ids. */
export function worldviewUrl(lat: number, lon: number, date: string): string {
  const clampLat = (v: number) => Math.max(-90, Math.min(90, v));
  const v = [lon - PAD_DEG, clampLat(lat - PAD_DEG), lon + PAD_DEG, clampLat(lat + PAD_DEG)].map((x) => x.toFixed(4)).join(",");
  return `${WORLDVIEW}?v=${v}&t=${date}&l=${TRUE_COLOR},${COASTLINES}`;
}

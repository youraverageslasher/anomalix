/* Climate analog: which grid point's early years match a place's recent years, by average temperature only. */

export const ANALOG_YEARS = 10;
export const ANALOG_MAX_GAP = 0.3;
export const EARTH_RADIUS_KM = 6371.0088;
export const KM_PER_DEG_LAT = 111.2;

export interface AnalogCell {
  lat: number;
  lon: number;
  state: string;
  /* Mean temperature of the cell's first ten valid years. */
  early: number;
}

export interface Analog {
  cell: AnalogCell;
  cityMean: number;
  gap: number;
  km: number;
  latKm: number;
  closerToEquator: boolean;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* Mean of the last ten values of a yearly series, or null when it has fewer. */
export function lastYearsMean(series: { year: number; value: number }[], n = ANALOG_YEARS): number | null {
  if (series.length < n) return null;
  const tail = series.slice(-n);
  return tail.reduce((s, p) => s + p.value, 0) / n;
}

/* The closest early mean among the cells; null when none is within the allowed gap. */
export function findAnalog(city: { lat: number; lon: number; mean: number }, cells: AnalogCell[], maxGap = ANALOG_MAX_GAP): Analog | null {
  let best: AnalogCell | null = null;
  let gap = Infinity;
  for (const c of cells) {
    if (!Number.isFinite(c.early)) continue;
    const g = Math.abs(c.early - city.mean);
    if (g < gap) {
      gap = g;
      best = c;
    }
  }
  if (!best || !(gap < maxGap)) return null;
  return {
    cell: best,
    cityMean: city.mean,
    gap,
    km: haversineKm(city.lat, city.lon, best.lat, best.lon),
    latKm: Math.abs(Math.abs(city.lat) - Math.abs(best.lat)) * KM_PER_DEG_LAT,
    closerToEquator: Math.abs(best.lat) < Math.abs(city.lat),
  };
}

import type { DataResult } from "./types";

export const ZONAL_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv";
const REVALIDATE = 86400;

/* The eight narrow bands that do not overlap, south to north, with their latitude limits. */
export const BANDS = [
  { id: "90S-64S", min: -90, max: -64 },
  { id: "64S-44S", min: -64, max: -44 },
  { id: "44S-24S", min: -44, max: -24 },
  { id: "24S-EQU", min: -24, max: 0 },
  { id: "EQU-24N", min: 0, max: 24 },
  { id: "24N-44N", min: 24, max: 44 },
  { id: "44N-64N", min: 44, max: 64 },
  { id: "64N-90N", min: 64, max: 90 },
] as const;
export type BandId = (typeof BANDS)[number]["id"];

export interface ZonalSeries {
  bands: Record<BandId, { year: number; value: number }[]>;
  /* The Glob column of the same file, so the band and the planet come from one table. */
  global: { year: number; value: number }[];
  firstYear: number;
  lastYear: number;
}

/* Header on line 1; *** marks a missing value; a year with any missing band is skipped. */
export function parseZonal(csv: string): ZonalSeries | null {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return null;
  const header = lines[0].split(",").map((s) => s.trim());
  if (header[0] !== "Year") return null;
  const idx = BANDS.map((b) => header.indexOf(b.id));
  const gi = header.indexOf("Glob");
  if (idx.some((i) => i < 0) || gi < 0) return null;
  const global: { year: number; value: number }[] = [];
  const bands = Object.fromEntries(BANDS.map((b) => [b.id, [] as { year: number; value: number }[]])) as ZonalSeries["bands"];
  let first = Infinity;
  let last = -Infinity;
  for (const line of lines.slice(1)) {
    const c = line.split(",").map((s) => s.trim());
    const year = Number(c[0]);
    if (!Number.isInteger(year) || c.length !== header.length) continue;
    const vals = [...idx, gi].map((i) => c[i]);
    if (vals.some((v) => !v || v.includes("*") || !Number.isFinite(Number(v)))) continue;
    BANDS.forEach((b, k) => bands[b.id].push({ year, value: Number(vals[k]) }));
    global.push({ year, value: Number(vals[vals.length - 1]) });
    first = Math.min(first, year);
    last = Math.max(last, year);
  }
  if (!Number.isFinite(first)) return null;
  return { bands, global, firstYear: first, lastYear: last };
}

/* The narrow band containing a latitude; the equator and the band limits go to the northern band. */
export function bandFor(lat: number): BandId | null {
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) return null;
  const b = BANDS.find((x) => lat >= x.min && (lat < x.max || (x.max === 90 && lat <= 90)));
  return b ? b.id : null;
}

let cached: Promise<DataResult<ZonalSeries>> | null = null;

export function fetchZonal(): Promise<DataResult<ZonalSeries>> {
  if (cached) return cached;
  cached = (async (): Promise<DataResult<ZonalSeries>> => {
    try {
      const res = await fetch(ZONAL_URL, { next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) return { ok: false, error: `NASA GISTEMP zonal file answered ${res.status}` };
      const z = parseZonal(await res.text());
      if (!z) return { ok: false, error: "NASA GISTEMP zonal file could not be parsed" };
      return { ok: true, data: z };
    } catch {
      return { ok: false, error: "NASA GISTEMP zonal file did not respond" };
    }
  })();
  cached.then((r) => {
    if (!r.ok) cached = null;
  });
  return cached;
}

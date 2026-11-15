import { createLimiter } from "./limit";
import type { DataResult, MonthValue } from "./types";
import { VARIABLES, type VariableCode } from "./variables";

/* Request bounds only, never shown as a period: the API refuses a start before 1981/01/01 (HTTP 422),
   and the end is the current year. Months the API has not filled come back as -999 and are dropped;
   every period in the UI is computed from the years that actually come back (see range.ts). */
export const POWER_START = 1981;
export const POWER_END = new Date().getUTCFullYear();
export const CELL_LAT = 0.5;
export const CELL_LON = 0.625;
const REVALIDATE = 86400;
const limit = createLimiter(4);
const cache = new Map<string, Promise<DataResult<PowerSeries>>>();

export interface PowerSeries {
  cell: { lat: number; lon: number };
  months: MonthValue[];
  elevation: number | null;
}

export function powerCell(lat: number, lon: number) {
  const cLat = Math.max(-90, Math.min(90, Math.round(lat / CELL_LAT) * CELL_LAT));
  let cLon = Math.round(lon / CELL_LON) * CELL_LON;
  if (cLon > 180) cLon -= 360;
  if (cLon < -180) cLon += 360;
  return { lat: +cLat.toFixed(3), lon: +cLon.toFixed(4) };
}

export const POWER_ENDPOINT = "https://power.larc.nasa.gov/api/temporal/monthly/point";

/* Daily maximum and minimum air temperature at 2 m, monthly means; fetched together, parsed one by one. */
export const EXTREMES = ["T2M_MAX", "T2M_MIN"] as const;
export type ExtremeCode = (typeof EXTREMES)[number];

export function powerUrl(lat: number, lon: number, variable: VariableCode | string): string {
  return (
    `${POWER_ENDPOINT}?parameters=${variable}&community=RE` +
    `&longitude=${lon}&latitude=${lat}&start=${POWER_START}&end=${POWER_END}&format=JSON`
  );
}

interface PowerJson {
  geometry?: { coordinates?: number[] };
  header?: { fill_value?: number };
  properties?: { parameter?: Record<string, Record<string, number> | undefined> };
}

/* Keys are YYYYMM; YYYY13 is the annual mean and is skipped; the fill value (-999) is dropped, never averaged. */
export function parsePowerMonthly(json: PowerJson, variable: VariableCode | string): MonthValue[] {
  const fill = json.header?.fill_value ?? -999;
  const raw = json.properties?.parameter?.[variable] ?? {};
  const out: MonthValue[] = [];
  for (const [key, v] of Object.entries(raw)) {
    if (key.length !== 6 || key.endsWith("13")) continue;
    const year = Number(key.slice(0, 4));
    const month = Number(key.slice(4));
    if (month < 1 || month > 12 || typeof v !== "number" || v === fill || v <= -900) continue;
    out.push({ year, month, value: v });
  }
  return out.sort((a, b) => a.year - b.year || a.month - b.month);
}

/* Keeps only years with all twelve months present, so annual and seasonal means never mix partial years. */
export function completeYears(months: MonthValue[]): MonthValue[] {
  const count = new Map<number, number>();
  for (const m of months) count.set(m.year, (count.get(m.year) ?? 0) + 1);
  return months.filter((m) => count.get(m.year) === 12);
}

export function fetchPower(lat: number, lon: number, variable: VariableCode): Promise<DataResult<PowerSeries>> {
  const cell = powerCell(lat, lon);
  const key = `${variable}:${cell.lat},${cell.lon}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const job = limit(async (): Promise<DataResult<PowerSeries>> => {
    try {
      const res = await fetch(powerUrl(cell.lat, cell.lon, variable), {
        next: { revalidate: REVALIDATE },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) return { ok: false, error: `NASA POWER answered ${res.status}` };
      const json = (await res.json()) as PowerJson;
      const months = parsePowerMonthly(json, variable);
      if (months.length === 0) return { ok: false, error: `NASA POWER returned no ${VARIABLES[variable].name.toLowerCase()} data for this cell` };
      const c = json.geometry?.coordinates;
      return { ok: true, data: { cell, months, elevation: c && Number.isFinite(c[2]) ? c[2] : null } };
    } catch {
      return { ok: false, error: "NASA POWER did not respond" };
    }
  });
  cache.set(key, job);
  job.then((r) => {
    if (!r.ok) cache.delete(key);
  });
  return job;
}

const extremeCache = new Map<string, Promise<DataResult<Record<ExtremeCode, MonthValue[]>>>>();

/* One request for both parameters; each key is filtered on its own (YYYY13 and -999 dropped per parameter). */
export function fetchPowerExtremes(lat: number, lon: number): Promise<DataResult<Record<ExtremeCode, MonthValue[]>>> {
  const cell = powerCell(lat, lon);
  const key = `${cell.lat},${cell.lon}`;
  const hit = extremeCache.get(key);
  if (hit) return hit;
  const job = limit(async (): Promise<DataResult<Record<ExtremeCode, MonthValue[]>>> => {
    try {
      const res = await fetch(powerUrl(cell.lat, cell.lon, EXTREMES.join(",")), { next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) return { ok: false, error: `NASA POWER answered ${res.status}` };
      const json = (await res.json()) as PowerJson;
      const out = Object.fromEntries(EXTREMES.map((k) => [k, parsePowerMonthly(json, k)])) as Record<ExtremeCode, MonthValue[]>;
      if (EXTREMES.some((k) => out[k].length === 0)) return { ok: false, error: "NASA POWER returned no daily maximum or minimum for this cell" };
      return { ok: true, data: out };
    } catch {
      return { ok: false, error: "NASA POWER did not respond" };
    }
  });
  extremeCache.set(key, job);
  job.then((r) => {
    if (!r.ok) extremeCache.delete(key);
  });
  return job;
}

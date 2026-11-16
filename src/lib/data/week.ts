/* "This week vs 45 years": a 7-day Open-Meteo forecast set against NASA POWER daily climatology for the same cell. */
import { percentile } from "./shift";
import { fetchUpstreamText } from "./upstream";
import { powerCell } from "./power";
import type { DataResult } from "./types";

export const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
export const POWER_DAILY_ENDPOINT = "https://power.larc.nasa.gov/api/temporal/daily/point";
export const CLIMATE_FIRST_YEAR = 1981;
/* Climatology window: days within this many days of the forecast date's day of year, in every past year. */
export const WINDOW_DAYS = 15;
export const RAIN_DAY_MM = 1;
export const RAIN_LIKELY_PCT = 50;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface ForecastDay {
  date: string;
  tmax: number | null;
  tmin: number | null;
  rainProb: number | null;
  rainSum: number | null;
}
export interface DailyClimate {
  date: string;
  tmax: number;
  tmin: number;
  rain: number;
}
export interface WindowStats {
  n: number;
  years: number;
  rainFreq: number;
  tmaxP10: number;
  tmaxP90: number;
  tminP10: number;
  tminP90: number;
  /* Share of window days whose daily maximum is below the forecast maximum (0 to 1). */
  hotterThan: number | null;
}
export interface WeekDay extends ForecastDay {
  weekday: string;
  climate: WindowStats;
}
export interface WeekReport {
  days: WeekDay[];
  summary: string;
  timezone: string;
  firstYear: number;
  lastYear: number;
  forecastUrl: string;
  climateUrl: string;
}

export function forecastUrl(lat: number, lon: number): string {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
    timezone: "auto",
    forecast_days: "7",
  });
  return `${FORECAST_ENDPOINT}?${q.toString()}`;
}

export function climateUrl(lat: number, lon: number, lastYear: number): string {
  const c = powerCell(lat, lon);
  return `${POWER_DAILY_ENDPOINT}?parameters=T2M_MAX,T2M_MIN,PRECTOTCORR&community=RE&longitude=${c.lon}&latitude=${c.lat}&start=${CLIMATE_FIRST_YEAR}0101&end=${lastYear}1231&format=JSON`;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function parseForecast(json: unknown): { days: ForecastDay[]; timezone: string } | null {
  const j = json as { timezone?: string; daily?: Record<string, unknown[]> };
  const d = j?.daily;
  if (!d || !Array.isArray(d.time) || d.time.length === 0) return null;
  const days = d.time.map((t, i) => ({
    date: String(t),
    tmax: num(d.temperature_2m_max?.[i]),
    tmin: num(d.temperature_2m_min?.[i]),
    rainProb: num(d.precipitation_probability_max?.[i]),
    rainSum: num(d.precipitation_sum?.[i]),
  }));
  return { days, timezone: j.timezone ?? "UTC" };
}

/* Daily POWER JSON to rows; days with any fill value (-999) are dropped. */
export function parsePowerDaily(json: unknown): DailyClimate[] {
  const j = json as { header?: { fill_value?: number }; properties?: { parameter?: Record<string, Record<string, number>> } };
  const fill = j?.header?.fill_value ?? -999;
  const p = j?.properties?.parameter;
  if (!p?.T2M_MAX || !p.T2M_MIN || !p.PRECTOTCORR) return [];
  const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v !== fill && v > -900;
  const out: DailyClimate[] = [];
  for (const [k, tmax] of Object.entries(p.T2M_MAX)) {
    const tmin = p.T2M_MIN[k];
    const rain = p.PRECTOTCORR[k];
    if (k.length !== 8 || !ok(tmax) || !ok(tmin) || !ok(rain)) continue;
    out.push({ date: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`, tmax, tmin, rain });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function dayOfYear(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000);
}

/* Circular distance in days between two days of the year (365-day year; Feb 29 sits next to Mar 1). */
function doyDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 365;
  return Math.min(d, 365 - d);
}

/* Climatology of the window around a calendar date, from every past year in the record. */
export function windowStats(history: DailyClimate[], date: string, forecastMax: number | null = null, half = WINDOW_DAYS): WindowStats {
  const target = dayOfYear(date);
  const w = history.filter((h) => doyDistance(dayOfYear(h.date), target) <= half);
  const maxes = w.map((h) => h.tmax);
  const mins = w.map((h) => h.tmin);
  const years = new Set(w.map((h) => h.date.slice(0, 4))).size;
  return {
    n: w.length,
    years,
    rainFreq: w.length ? w.filter((h) => h.rain >= RAIN_DAY_MM).length / w.length : NaN,
    tmaxP10: percentile(maxes, 0.1),
    tmaxP90: percentile(maxes, 0.9),
    tminP10: percentile(mins, 0.1),
    tminP90: percentile(mins, 0.9),
    hotterThan: forecastMax === null || !maxes.length ? null : maxes.filter((t) => t < forecastMax).length / maxes.length,
  };
}

export function weekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/* "early November", "mid-November", "late November", from the middle day of the week. */
export function periodLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  const month = MONTHS[m - 1];
  return d <= 10 ? `early ${month}` : d <= 20 ? `mid-${month}` : `late ${month}`;
}

function listDays(names: string[]): string {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/* One line, all from the numbers: which days look rainy, and where the week's highs sit in the record. */
export function summaryLine(days: WeekDay[], firstYear: number): string {
  const rainy = days.filter((d) => (d.rainProb ?? 0) >= RAIN_LIKELY_PCT).map((d) => d.weekday);
  const rain = rainy.length === 0 ? "rain unlikely" : rainy.length === days.length ? "rain likely every day" : `rain likely ${listDays(rainy)}`;
  const ranks = days.map((d) => d.climate.hotterThan).filter((x): x is number => x !== null);
  if (!ranks.length) return `Next ${days.length} days: ${rain}.`;
  const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  const mid = days[Math.floor(days.length / 2)].date;
  const pct = Math.round(avg * 100);
  const heat = pct >= 50 ? `highs warmer than ${pct}% of ${periodLabel(mid)} days since ${firstYear}` : `highs cooler than ${100 - pct}% of ${periodLabel(mid)} days since ${firstYear}`;
  return `Next ${days.length} days: ${rain}, ${heat}.`;
}

export function buildWeek(forecast: { days: ForecastDay[]; timezone: string }, history: DailyClimate[], urls: { forecastUrl: string; climateUrl: string }): WeekReport | null {
  if (!history.length || !forecast.days.length) return null;
  const days = forecast.days.map((f) => ({ ...f, weekday: weekday(f.date), climate: windowStats(history, f.date, f.tmax) }));
  const firstYear = Number(history[0].date.slice(0, 4));
  const lastYear = Number(history[history.length - 1].date.slice(0, 4));
  return { days, summary: summaryLine(days, firstYear), timezone: forecast.timezone, firstYear, lastYear, ...urls };
}

export async function weekReport(lat: number, lon: number, lastYear = new Date().getUTCFullYear() - 1): Promise<DataResult<WeekReport>> {
  const fUrl = forecastUrl(lat, lon);
  const cUrl = climateUrl(lat, lon, lastYear);
  const [f, c] = await Promise.all([fetchUpstreamText(fUrl, "open-meteo", 1800, 6000), fetchUpstreamText(cUrl, "power-daily", 86400, 20000)]);
  if (!f.ok) return { ok: false, error: `Open-Meteo ${f.reason}` };
  if (!c.ok) return { ok: false, error: `NASA POWER daily ${c.reason}` };
  let forecast: ReturnType<typeof parseForecast> = null;
  let history: DailyClimate[] = [];
  try {
    forecast = parseForecast(JSON.parse(f.text));
    history = parsePowerDaily(JSON.parse(c.text));
  } catch {
    return { ok: false, error: "A forecast or climate response could not be read" };
  }
  if (!forecast) return { ok: false, error: "Open-Meteo returned no daily forecast" };
  const week = buildWeek(forecast, history, { forecastUrl: fUrl, climateUrl: cUrl });
  return week ? { ok: true, data: week } : { ok: false, error: "NASA POWER returned no daily history for this cell" };
}

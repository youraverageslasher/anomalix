import type { DataResult, MonthValue } from "./types";
import { coverage, type Coverage } from "./range";
import { fetchUpstreamText } from "./upstream";
import { GISTEMP_SNAPSHOT } from "./gistempSnapshot";
import type { DataOrigin } from "./origin";

export const GISTEMP_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv";
const REVALIDATE = 86400;
/* Lowest year a request may ask for; the years shown always come from the file itself. */
export const GISTEMP_FIRST_REQUEST = 1880;

export interface GistempSeries {
  months: MonthValue[];
  firstYear: number;
  lastYear: number;
  /* Includes the partial current year, which never enters the trend. */
  coverage: Coverage | null;
  /* Live file or bundled snapshot; never changes a number, only the source line. */
  origin?: DataOrigin;
}

/* Title on line 1, header on line 2, *** for missing months. Only complete years are kept for the analysis. */
export function parseGistempMonthly(csv: string, lastYear = Infinity): GistempSeries {
  const lines = csv.split(/\r?\n/);
  const h = lines.findIndex((l) => l.startsWith("Year,"));
  const header = h >= 0 ? lines[h].split(",") : [];
  const jan = header.indexOf("Jan");
  const months: MonthValue[] = [];
  const valid: MonthValue[] = [];
  let firstYear = Infinity;
  let last = -Infinity;
  if (jan < 0) return { months, firstYear: NaN, lastYear: NaN, coverage: null };
  for (const line of lines.slice(h + 1)) {
    const cells = line.split(",");
    const year = Number(cells[0]);
    if (!Number.isInteger(year) || year > lastYear) continue;
    const vals = cells.slice(jan, jan + 12);
    vals.forEach((v, i) => {
      if (v && !v.includes("*") && Number.isFinite(Number(v))) valid.push({ year, month: i + 1, value: Number(v) });
    });
    if (vals.length < 12 || vals.some((v) => !v || v.includes("*"))) continue;
    vals.forEach((v, i) => months.push({ year, month: i + 1, value: Number(v) }));
    firstYear = Math.min(firstYear, year);
    last = Math.max(last, year);
  }
  return { months, firstYear, lastYear: last, coverage: coverage(valid) };
}

/* After a fallback, the live file is tried again once this much time has passed. */
export const SNAPSHOT_RETRY_MS = 10 * 60 * 1000;

/* The bundled copy, parsed by the same function as the live file. */
export function gistempFromSnapshot(reason: string): DataResult<GistempSeries> {
  const series = parseGistempMonthly(GISTEMP_SNAPSHOT.glb.csv);
  if (series.months.length === 0) return { ok: false, error: `NASA GISTEMP ${reason}, and the bundled snapshot had no complete years` };
  return { ok: true, data: { ...series, origin: { kind: "snapshot", fetchedAt: GISTEMP_SNAPSHOT.fetchedAt, lastModified: GISTEMP_SNAPSHOT.lastModified, reason } } };
}

/* Live first; on any failure (no answer, an error status, an empty file) the bundled snapshot. */
export async function loadGistemp(fetchText: typeof fetchUpstreamText = fetchUpstreamText): Promise<DataResult<GistempSeries>> {
  const r = await fetchText(GISTEMP_URL, "gistemp", REVALIDATE);
  if (!r.ok) return gistempFromSnapshot(r.reason);
  const series = parseGistempMonthly(r.text);
  if (series.months.length === 0) return gistempFromSnapshot("file had no complete years");
  return { ok: true, data: { ...series, origin: { kind: "live" } } };
}

let cached: { at: number; p: Promise<DataResult<GistempSeries>> } | null = null;

export function fetchGistemp(): Promise<DataResult<GistempSeries>> {
  if (cached) return cached.p;
  const entry = { at: Date.now(), p: loadGistemp() };
  cached = entry;
  entry.p.then((r) => {
    if (!r.ok) cached = null;
    else if (r.data.origin?.kind === "snapshot") setTimeout(() => cached === entry && (cached = null), SNAPSHOT_RETRY_MS).unref?.();
  });
  return entry.p;
}

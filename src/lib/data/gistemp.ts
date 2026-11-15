import type { DataResult, MonthValue } from "./types";
import { coverage, type Coverage } from "./range";

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

let cached: Promise<DataResult<GistempSeries>> | null = null;

export function fetchGistemp(): Promise<DataResult<GistempSeries>> {
  if (cached) return cached;
  cached = (async (): Promise<DataResult<GistempSeries>> => {
    try {
      const res = await fetch(GISTEMP_URL, { next: { revalidate: REVALIDATE }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) return { ok: false, error: `NASA GISTEMP answered ${res.status}` };
      const series = parseGistempMonthly(await res.text());
      if (series.months.length === 0) return { ok: false, error: "NASA GISTEMP file had no complete years" };
      return { ok: true, data: series };
    } catch {
      return { ok: false, error: "NASA GISTEMP did not respond" };
    }
  })();
  cached.then((r) => {
    if (!r.ok) cached = null;
  });
  return cached;
}

/* Monthly export in tidy form: one row per valid month, with the month's climatology and its deseasonalized anomaly. */
export interface MonthValue {
  year: number;
  month: number;
  value: number;
}

export interface TidyRow extends MonthValue {
  climatology: number;
  anomaly: number;
  partialYear: boolean;
}

export const MONTHLY_COLUMNS = ["place", "lat", "lon", "parameter", "year", "month", "date", "value", "climatology", "anomaly", "partial_year"] as const;

/*
 * Rows: the complete-year months of the report period, plus the valid months of a partial year that follows it.
 * Invalid months (not finite, or a month outside 1-12) are dropped, never filled.
 * Climatology: for each calendar month, the mean of that month over every exported row, so each month's anomalies average zero.
 */
export function monthlyTidy(complete: MonthValue[], partial: MonthValue[] = []): TidyRow[] {
  const valid = (m: MonthValue) => Number.isInteger(m.year) && Number.isInteger(m.month) && m.month >= 1 && m.month <= 12 && Number.isFinite(m.value);
  const lastComplete = complete.reduce((y, m) => Math.max(y, m.year), -Infinity);
  const rows = [...complete.filter(valid).map((m) => ({ ...m, partialYear: false })), ...partial.filter((m) => valid(m) && m.year > lastComplete).map((m) => ({ ...m, partialYear: true }))].sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );
  const sum = new Array<number>(13).fill(0);
  const n = new Array<number>(13).fill(0);
  for (const r of rows) {
    sum[r.month] += r.value;
    n[r.month] += 1;
  }
  return rows.map((r) => {
    const climatology = sum[r.month] / n[r.month];
    return { year: r.year, month: r.month, value: r.value, climatology, anomaly: r.value - climatology, partialYear: r.partialYear };
  });
}

const r4 = (x: number) => (Math.round(x * 1e4) / 1e4).toString();
const cell = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function monthlyCsv(rows: TidyRow[], o: { place: string; lat: number; lon: number; parameter: string }): string {
  const head = MONTHLY_COLUMNS.join(",");
  const body = rows.map((r) =>
    [cell(o.place), r4(o.lat), r4(o.lon), o.parameter, r.year, r.month, `${r.year}-${String(r.month).padStart(2, "0")}-01`, r4(r.value), r4(r.climatology), r4(r.anomaly), r.partialYear]
      .map(String)
      .join(","),
  );
  return [head, ...body].join("\n") + "\n";
}

export function monthlyFilename(parameter: string, lat: number, lon: number): string {
  return `anomalix_${parameter}_${r4(lat)}_${r4(lon)}_monthly.csv`;
}

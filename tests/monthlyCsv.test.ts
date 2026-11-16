import { describe, expect, it } from "vitest";
import { monthlyCsv, monthlyFilename, monthlyTidy, partialMonthsFor, MONTHLY_COLUMNS, type MonthValue } from "@/lib/data/monthlyCsv";
import { parsePowerMonthly } from "@/lib/data/power";

/* Three complete years with a seasonal cycle and a small trend. */
const complete: MonthValue[] = [];
for (const year of [2023, 2024, 2025]) for (let month = 1; month <= 12; month++) complete.push({ year, month, value: 20 + 5 * Math.sin((month / 12) * 2 * Math.PI) + 0.1 * (year - 2023) });

describe("monthly tidy export", () => {
  it("climatology is the mean of that calendar month over the exported rows", () => {
    const rows = monthlyTidy(complete);
    const jan = complete.filter((m) => m.month === 1).map((m) => m.value);
    const mean = jan.reduce((a, b) => a + b, 0) / jan.length;
    for (const r of rows.filter((r) => r.month === 1)) expect(r.climatology).toBeCloseTo(mean, 12);
  });
  it("anomaly is value minus climatology, and averages zero for every calendar month", () => {
    const rows = monthlyTidy(complete, [{ year: 2026, month: 1, value: 25 }, { year: 2026, month: 2, value: 26 }]);
    for (const r of rows) expect(r.anomaly).toBeCloseTo(r.value - r.climatology, 12);
    for (let m = 1; m <= 12; m++) {
      const a = rows.filter((r) => r.month === m).map((r) => r.anomaly);
      expect(Math.abs(a.reduce((x, y) => x + y, 0) / a.length)).toBeLessThan(1e-9);
    }
  });
  it("drops invalid months and never fills them", () => {
    const json = { header: { fill_value: -999 }, properties: { parameter: { RH2M: { "202301": 60, "202302": -999, "202303": 55, "202313": 58 } } } };
    const parsed = parsePowerMonthly(json as never, "RH2M");
    const rows = monthlyTidy([...parsed, { year: 2023, month: 4, value: NaN }]);
    expect(rows.map((r) => r.month)).toEqual([1, 3]);
  });
  it("flags the months of an incomplete year after the last complete one as partial_year", () => {
    const rows = monthlyTidy(complete, [
      { year: 2026, month: 1, value: 21 },
      { year: 2026, month: 9, value: 22 },
      { year: 2025, month: 1, value: 99 },
    ]);
    expect(rows.length).toBe(36 + 2);
    expect(rows.filter((r) => r.partialYear).map((r) => `${r.year}-${r.month}`)).toEqual(["2026-1", "2026-9"]);
    expect(rows.filter((r) => r.year < 2026).every((r) => !r.partialYear)).toBe(true);
  });
  it("writes the columns in order, one line per row, and the agreed file name", () => {
    const rows = monthlyTidy(complete, [{ year: 2026, month: 3, value: 30 }]);
    const csv = monthlyCsv(rows, { place: "São José do Rio Preto, SP", lat: -20.81972, lon: -49.37944, parameter: "RH2M" }).trim().split("\n");
    expect(csv[0]).toBe(MONTHLY_COLUMNS.join(","));
    expect(csv.length).toBe(rows.length + 1);
    expect(csv[1].startsWith('"São José do Rio Preto, SP",-20.8197,-49.3794,RH2M,2023,1,2023-01-01,')).toBe(true);
    expect(csv.at(-1)).toMatch(/,2026,3,2026-03-01,30,.*,true$/);
    expect(monthlyFilename("RH2M", -20.81972, -49.37944)).toBe("anomalix_RH2M_-20.8197_-49.3794_monthly.csv");
  });
  it("keeps the partial year when the period reaches the last complete year, whether it ends there or later", () => {
    const all: MonthValue[] = [...complete, { year: 2026, month: 1, value: 1 }, { year: 2026, month: 2, value: 2 }];
    expect(partialMonthsFor(all, 2025, 2025).length).toBe(2);
    expect(partialMonthsFor(all, 2025, 2026).length).toBe(2);
    expect(partialMonthsFor(all, 2025, 2024)).toEqual([]);
  });
});

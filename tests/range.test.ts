import { describe, expect, it } from "vitest";
import { coverage, partialNote, periodText, spanOf } from "@/lib/data/range";
import { parsePowerMonthly, completeYears } from "@/lib/data/power";
import { parseGistempMonthly } from "@/lib/data/gistemp";
import { analyze, olsT } from "@/lib/data/analyze";

/* Synthetic test inputs only, never shown in the UI. Every period in the app is computed from live data. */
function power(from: number, to: number, partialMonths = 0) {
  const T2M: Record<string, number> = {};
  for (let y = from; y <= to; y++) {
    for (let m = 1; m <= 12; m++) T2M[`${y}${String(m).padStart(2, "0")}`] = 20 + (y - from) * 0.05 + (m % 3) * 0.1;
    T2M[`${y}13`] = 9999;
  }
  const next = to + 1;
  for (let m = 1; m <= 12; m++) T2M[`${next}${String(m).padStart(2, "0")}`] = m <= partialMonths ? 21 : -999;
  return { header: { fill_value: -999 }, properties: { parameter: { T2M } } };
}

describe("coverage and the real year range", () => {
  it("reads first and last valid year, and the complete years, from the response", () => {
    const months = parsePowerMonthly(power(2001, 2015, 9), "T2M");
    expect(months.some((m) => m.value === 9999 || m.value === -999)).toBe(false);
    expect(coverage(months)).toEqual({ firstValid: 2001, lastValid: 2016, firstComplete: 2001, lastComplete: 2015, completeYears: 15 });
  });
  it("a year of only -999 does not count as valid", () => {
    const c = coverage(parsePowerMonthly(power(2001, 2015, 0), "T2M"));
    expect(c?.lastValid).toBe(2015);
  });
  it("the trend span comes from the complete years, without asking for a period", () => {
    const months = completeYears(parsePowerMonthly(power(2001, 2015, 9), "T2M"));
    const a = analyze(months);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const s = spanOf(a);
    expect(s).toEqual({ from: 2001, to: 2015, n: 15 });
    if (s) expect(periodText(s, "power")).toBe("2001 to 2015, 15 years of NASA reanalysis");
  });
  it("names the partial year only when it follows the last complete year", () => {
    const raw = parsePowerMonthly(power(2001, 2015, 9), "T2M");
    const a = analyze(completeYears(raw));
    if (!a.ok) throw new Error(a.error);
    expect(partialNote(coverage(raw), spanOf(a))).toContain("2016");
    const short = analyze(completeYears(raw), { startYear: 2001, endYear: 2012 });
    if (!short.ok) throw new Error(short.error);
    expect(partialNote(coverage(raw), spanOf(short))).toBe("");
  });
  it("GISTEMP keeps its own range and reports its partial year", () => {
    const head = "Land-Ocean: Global Means\nYear,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,J-D,D-N,DJF,MAM,JJA,SON\n";
    const full = (y: number) => `${y},${Array(12).fill(".1").join(",")},.1,.1,.1,.1,.1,.1`;
    const partial = `1903,.2,.2,${Array(10).fill("***").join(",")},***,***,***,***,***,***`;
    const g = parseGistempMonthly(head + [full(1900), full(1901), full(1902), partial].join("\n"));
    expect([g.firstYear, g.lastYear]).toEqual([1900, 1902]);
    expect(g.coverage).toMatchObject({ firstValid: 1900, lastValid: 1903, lastComplete: 1902 });
  });
});

describe("lag 1 autocorrelation of the residuals", () => {
  it("is near minus one for an alternating series and positive for slow waves", () => {
    const xs = Array.from({ length: 40 }, (_, i) => i);
    expect(olsT(xs, xs.map((x) => (x % 2 ? 1 : -1))).lag1).toBeLessThan(-0.8);
    expect(olsT(xs, xs.map((x) => Math.sin(x / 4))).lag1).toBeGreaterThan(0.5);
  });
});

import { describe, expect, it } from "vitest";
import { aboutRatio, agreement, alignTwoSources, type YearValue } from "@/lib/data/twoSource";
import { parsePowerMonthly, completeYears } from "@/lib/data/power";
import { parseGistempMonthly } from "@/lib/data/gistemp";

/* Synthetic test inputs only, never shown in the UI. Real values are always computed live. */
const line = (from: number, to: number, slope: number, wiggle: number): YearValue[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ year: from + i, value: slope * i + (i % 2 === 0 ? wiggle : -wiggle) }));

describe("POWER key parsing", () => {
  it("skips the YYYY13 annual key and drops the fill value", () => {
    const T2M: Record<string, number> = {};
    for (let m = 1; m <= 12; m++) T2M[`2001${String(m).padStart(2, "0")}`] = m;
    T2M["200113"] = 99;
    for (let m = 1; m <= 12; m++) T2M[`2002${String(m).padStart(2, "0")}`] = m === 5 ? -999 : m;
    const months = parsePowerMonthly({ header: { fill_value: -999 }, properties: { parameter: { T2M } } }, "T2M");
    expect(months.some((p) => p.value === 99 || p.value === -999)).toBe(false);
    expect(months.filter((p) => p.year === 2002)).toHaveLength(11);
    expect(completeYears(months).every((p) => p.year === 2001)).toBe(true);
  });
});

describe("GISTEMP CSV parsing", () => {
  const head = "Land-Ocean: Global Means\nYear,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,J-D,D-N,DJF,MAM,JJA,SON\n";
  const row = (y: number, v: string) => `${y},${Array(12).fill(v).join(",")},${v},${v},${v},${v},${v},${v}`;
  it("reads the header on line 2, skips *** and leaves out a partial year", () => {
    const partial = `2003,${["0.5", "0.5", "0.5", "***", "***", "***", "***", "***", "***", "***", "***", "***"].join(",")},***,***,***,***,***,***`;
    const csv = head + [row(2000, ".10"), row(2001, ".20"), row(2002, "***"), partial].join("\n");
    const s = parseGistempMonthly(csv, 2100);
    expect(s.firstYear).toBe(2000);
    expect(s.lastYear).toBe(2001);
    expect(s.months).toHaveLength(24);
    expect(s.months.every((m) => Number.isFinite(m.value))).toBe(true);
  });
});

describe("baseline alignment", () => {
  it("centres both series on their mean over all the shared years", () => {
    const r = alignTwoSources(line(1981, 2025, 0.05, 0.01), line(1880, 2025, 0.02, 0.01));
    expect(r).not.toBeNull();
    if (!r) return;
    expect(r.years[0]).toBe(1981);
    expect(r.years[r.years.length - 1]).toBe(2025);
    expect(r.baseline).toEqual({ from: 1981, to: 2025, years: 45 });
    for (const s of [r.local, r.global]) {
      const base = s.anomalies.map((p) => p.value);
      expect(base.reduce((a, b) => a + b, 0) / base.length).toBeCloseTo(0, 10);
    }
  });
  it("keeps only the years both series have", () => {
    const local = line(1981, 2020, 0.05, 0.01).filter((p) => p.year !== 1990);
    const r = alignTwoSources(local, line(1985, 2025, 0.02, 0.01));
    expect(r?.years.includes(1990)).toBe(false);
    expect(r?.years[0]).toBe(1985);
    expect(r?.years[r.years.length - 1]).toBe(2020);
  });
  it("refuses a common period shorter than the minimum", () => {
    expect(alignTwoSources(line(2000, 2005, 0.1, 0), line(2000, 2005, 0.1, 0))).toBeNull();
  });
});

describe("agreement", () => {
  const fits = (a: YearValue[], b: YearValue[]) => {
    const r = alignTwoSources(a, b);
    if (!r) throw new Error("alignment failed");
    return agreement(r.local, r.global);
  };
  it("both significant and rising", () => {
    const g = fits(line(1981, 2025, 0.05, 0.02), line(1981, 2025, 0.02, 0.01));
    expect(g).toMatchObject({ kind: "same", direction: "rising" });
    if (g.kind === "same") expect(g.ratio).toBeGreaterThan(1);
  });
  it("computes both slopes on the same years only", () => {
    const local = line(1981, 2025, 0.05, 0.02);
    const global = [...line(1880, 1980, -0.01, 0.01), ...line(1981, 2025, 0.02, 0.01)];
    const r = alignTwoSources(local, global);
    expect(r?.years[0]).toBe(1981);
    expect(r?.global.trend.perDecade).toBeCloseTo(0.2, 6);
  });
  it("words the ratio as an approximation to one decimal", () => {
    expect(aboutRatio(2.4003)).toBe("about 2.4");
  });
  it("both significant and falling", () => {
    expect(fits(line(1981, 2025, -0.05, 0.02), line(1981, 2025, -0.02, 0.01))).toMatchObject({ kind: "same", direction: "falling" });
  });
  it("opposite signs", () => {
    expect(fits(line(1981, 2025, -0.05, 0.02), line(1981, 2025, 0.02, 0.01))).toEqual({ kind: "none", reason: "opposite" });
  });
  it("one series inconclusive", () => {
    expect(fits(line(1981, 2025, 0, 1), line(1981, 2025, 0.02, 0.01))).toEqual({ kind: "none", reason: "inconclusive" });
  });
});

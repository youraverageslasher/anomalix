import { describe, expect, it } from "vitest";
import { findAnalog, haversineKm, lastYearsMean, KM_PER_DEG_LAT } from "@/lib/data/analog";
import { BONFERRONI_P, pullingSeason, quarterMeans, seasonFits } from "@/lib/data/seasons";
import { highsShift, kde, mannWhitney, median, percentile } from "@/lib/data/shift";
import type { MonthValue } from "@/lib/data/types";

/* Synthetic test inputs only, never shown in the UI. */
describe("climate analog", () => {
  it("haversine matches one degree of latitude and a quarter of the globe", () => {
    expect(haversineKm(0, 0, 1, 0)).toBeCloseTo(111.19, 1);
    expect(haversineKm(0, 0, 0, 90)).toBeCloseTo(10007.5, 0);
  });
  it("takes the last ten values", () => {
    expect(lastYearsMean(Array.from({ length: 12 }, (_, i) => ({ year: 2000 + i, value: i })))).toBe(6.5);
    expect(lastYearsMean([{ year: 1, value: 1 }])).toBeNull();
  });
  it("picks the closest early mean and hides when the gap is 0.3 or more", () => {
    const cells = [
      { lat: -10.5, lon: -48.5, state: "TO", early: 26.0 },
      { lat: -20.5, lon: -49.5, state: "SP", early: 23.0 },
    ];
    const a = findAnalog({ lat: -20.8, lon: -49.4, mean: 25.9 }, cells);
    expect(a?.cell.state).toBe("TO");
    expect(a?.closerToEquator).toBe(true);
    expect(a?.latKm).toBeCloseTo((20.8 - 10.5) * KM_PER_DEG_LAT, 6);
    expect(findAnalog({ lat: -20.8, lon: -49.4, mean: 24.5 }, cells)).toBeNull();
  });
});

function months(from: number, to: number, f: (y: number, m: number) => number): MonthValue[] {
  const out: MonthValue[] = [];
  for (let y = from; y <= to; y++) for (let m = 1; m <= 12; m++) out.push({ year: y, month: m, value: f(y, m) });
  return out;
}

describe("seasons", () => {
  it("Dec to Feb uses the December of the same year", () => {
    const s = quarterMeans(months(2001, 2002, (y, m) => (m === 12 ? y : 0)), [12, 1, 2]);
    expect(s[0]).toEqual({ year: 2001, value: 2001 / 3 });
  });
  it("names the season with the largest strictly significant slope", () => {
    const wig = (y: number) => (y % 2 ? 0.01 : -0.01);
    const fits = seasonFits(months(1981, 2025, (y, m) => ([6, 7, 8].includes(m) ? 0.06 : 0.02) * (y - 1981) + wig(y)));
    expect(fits).not.toBeNull();
    expect(pullingSeason(fits!)?.label).toBe("Jun to Aug");
    expect(BONFERRONI_P).toBeCloseTo(0.0125, 10);
  });
  it("no season stands out when none passes the stricter bar", () => {
    const fits = seasonFits(months(1981, 2025, (y, m) => ((y * 7 + m * 13) % 11) / 10));
    expect(pullingSeason(fits!)).toBeNull();
  });
});

describe("daily highs shift", () => {
  it("median and percentile", () => {
    expect(median([3, 1, 2, 10])).toBe(2.5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBeCloseTo(9.1, 10);
  });
  it("Mann-Whitney separates two clearly shifted samples and not two equal ones", () => {
    const a = Array.from({ length: 15 }, (_, i) => 30 + i * 0.01);
    const b = Array.from({ length: 15 }, (_, i) => 31 + i * 0.01);
    expect(mannWhitney(b, a).p).toBeLessThan(0.001);
    expect(mannWhitney(a, a).p).toBeGreaterThan(0.9);
  });
  it("counts late years above the early 90th percentile", () => {
    const s = Array.from({ length: 45 }, (_, i) => ({ year: 1981 + i, value: 30 + i * 0.05 }));
    const r = highsShift(s)!;
    expect(r.early[0].year).toBe(1981);
    expect(r.late[14].year).toBe(2025);
    expect(r.rose).toBe(true);
    expect(r.aboveP90).toBe(15);
    expect(highsShift(s.slice(0, 20))).toBeNull();
  });
  it("kernel density integrates to about one", () => {
    const grid = Array.from({ length: 401 }, (_, i) => -10 + i * 0.05);
    const d = kde([0, 1, 2], grid, 0.5);
    expect(d.reduce((s, v) => s + v * 0.05, 0)).toBeCloseTo(1, 2);
  });
});

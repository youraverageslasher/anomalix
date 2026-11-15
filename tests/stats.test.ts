import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  annualAnomalies,
  annualMeans,
  decompose,
  movingAverage,
  normalCdf,
  ols,
  senSlope,
  type MonthlyPoint,
} from "@/lib/stats";
import { mannKendallTest } from "@/lib/data/mannkendall";
import { parseCoords } from "@/lib/geo";
import { parsePowerMonthly } from "@/lib/data/power";
import { parseGistempMonthly } from "@/lib/data/gistemp";

const mkOf = (ys: number[]) => mannKendallTest(ys.map((_, i) => i), ys);
import { analyze } from "@/lib/data/analyze";

const fixture = (f: string) => readFileSync(path.join(__dirname, "fixtures", f), "utf8");

describe("ols", () => {
  it("recovers an exact line", () => {
    const xs = [0, 1, 2, 3, 4, 5];
    const r = ols(xs, xs.map((x) => 2 * x + 1));
    expect(r.slope).toBeCloseTo(2, 10);
    expect(r.intercept).toBeCloseTo(1, 10);
    expect(r.se).toBeCloseTo(0, 10);
  });
  it("computes a known standard error", () => {
    const r = ols([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(r.slope).toBeCloseTo(0.6, 10);
    expect(r.se).toBeCloseTo(0.2828427, 6);
    expect(r.ci95).toBeCloseTo(1.96 * 0.2828427, 6);
  });
});

describe("mann-kendall", () => {
  it("a monotonic rising series has maximum S", () => {
    const r = mkOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.s).toBe(45);
    expect(r.variance).toBeCloseTo(125, 10);
    expect(r.p).toBeLessThan(0.001);
  });
  it("corrects variance for ties", () => {
    const r = mkOf([1, 1, 2, 3]);
    expect(r.variance).toBeCloseTo((4 * 3 * 13 - 2 * 1 * 9) / 18, 10);
  });
  it("a constant series is not significant", () => {
    expect(mkOf([5, 5, 5, 5, 5]).p).toBe(1);
  });
  it("normal cdf matches table values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 4);
    expect(normalCdf(-1.645)).toBeCloseTo(0.05, 3);
  });
});

describe("helpers", () => {
  it("Sen slope is the median of pairwise slopes", () => {
    expect(senSlope([0, 1, 2, 3, 4], [0, 1, 2, 3, 40])).toBeCloseTo(1, 10);
  });
  it("12 month moving average starts at month 12", () => {
    const ma = movingAverage(Array.from({ length: 14 }, (_, i) => i), 12);
    expect(ma[10]).toBeNull();
    expect(ma[11]).toBeCloseTo(5.5, 10);
    expect(ma[13]).toBeCloseTo(7.5, 10);
  });
  it("incomplete years stay out of the annual mean", () => {
    const s: MonthlyPoint[] = [];
    for (let m = 1; m <= 12; m++) s.push({ year: 2000, month: m, value: 10 });
    for (let m = 1; m <= 11; m++) s.push({ year: 2001, month: m, value: 20 });
    expect(annualMeans(s)).toEqual([{ year: 2000, value: 10 }]);
  });
  it("anomalies are relative to 1981-2010", () => {
    const annual = Array.from({ length: 40 }, (_, i) => ({ year: 1981 + i, value: i < 30 ? 20 : 22 }));
    const { baseline, anomalies } = annualAnomalies(annual);
    expect(baseline).toBe(20);
    expect(anomalies[35].value).toBe(2);
  });
  it("decomposition removes the cycle and the trend", () => {
    const s: MonthlyPoint[] = [];
    for (let y = 1981; y <= 2020; y++)
      for (let m = 1; m <= 12; m++)
        s.push({ year: y, month: m, value: 20 + 3 * Math.cos((2 * Math.PI * m) / 12) + 0.03 * (y - 1981) });
    const d = decompose(s);
    expect(d.trendPerYear).toBeCloseTo(0.03, 3);
    expect(Math.max(...d.residual.map((r) => Math.abs(r.value)))).toBeLessThan(0.05);
  });
});

describe("geo", () => {
  it("accepts pasted coordinates", () => {
    expect(parseCoords("-20.81, -49.38")).toEqual({ lat: -20.81, lon: -49.38 });
    expect(parseCoords("-20,81; -49,38")).toEqual({ lat: -20.81, lon: -49.38 });
    expect(parseCoords("Rio Preto")).toBeNull();
    expect(parseCoords("95, 10")).toBeNull();
  });
});

/* Real NASA POWER response for São José do Rio Preto, 1981-2024, kept as a test fixture only (the app always fetches live).
   Expected values come from an independent Python computation: compute live, never hardcode them in the UI. */
describe("real Rio Preto data through the live pipeline", () => {
  const months = parsePowerMonthly(JSON.parse(fixture("power-sjrp-t2m-monthly-1981-2024.json")), "T2M");
  const gis = parseGistempMonthly(fixture("gistemp-glb-ts-dsst.csv"));
  const a = analyze(months, { startYear: 1981, endYear: 2024 });

  it("reads 528 months and skips the annual keys (13)", () => {
    expect(months).toHaveLength(528);
    expect(months.every((p) => p.month >= 1 && p.month <= 12)).toBe(true);
  });
  it("GISTEMP keeps only complete years", () => {
    const years = new Set(gis.months.map((m) => m.year));
    for (const y of years) expect(gis.months.filter((m) => m.year === y)).toHaveLength(12);
  });
  it("matches an independent Python computation (tolerance 1e-6)", () => {
    if (!a.ok) throw new Error(a.error);
    const tol = 1e-6;
    expect(Math.abs(a.climatology[0] - 24.89)).toBeLessThan(tol);
    expect(Math.abs(a.trend.perDecade - 0.4929116748884191)).toBeLessThan(tol);
    expect(a.mk.s).toBe(478);
    expect(Math.abs(a.mk.variance - 9775.333333333334)).toBeLessThan(tol);
    expect(Math.abs(a.mk.p - 1.4035272299194523e-6)).toBeLessThan(tol);
  });
});

import { describe, expect, it } from "vitest";
import { analyze, olsT, periodMeans, TOO_SHORT } from "@/lib/data/analyze";
import { tCdf, tQuantile } from "@/lib/data/tdist";
import { verdict } from "@/lib/data/verdict";
import { colorFor, binFor, stripeColor } from "@/lib/data/color";
import { completeYears, parsePowerMonthly, powerCell, powerUrl } from "@/lib/data/power";
import { parseGistempMonthly } from "@/lib/data/gistemp";
import { mannKendallTest } from "@/lib/data/mannkendall";
const mkOf = (ys: number[]) => mannKendallTest(ys.map((_, i) => i), ys);
import type { MonthValue } from "@/lib/data/types";

// Synthetic test values below are for testing only: compute live, never hardcode in the UI.

describe("t distribution", () => {
  it("matches tabulated critical values", () => {
    expect(tQuantile(0.975, 10)).toBeCloseTo(2.228139, 5);
    expect(tQuantile(0.975, 42)).toBeCloseTo(2.018082, 5);
    expect(tQuantile(0.975, 1)).toBeCloseTo(12.7062, 3);
    expect(tCdf(0, 7)).toBeCloseTo(0.5, 10);
  });
});

describe("OLS with t-based 95% interval", () => {
  it("recovers an exact line with zero width", () => {
    const xs = [0, 1, 2, 3, 4, 5];
    const r = olsT(xs, xs.map((x) => 0.03 * x + 1));
    expect(r.perDecade).toBeCloseTo(0.3, 10);
    expect(r.ci95PerDecade).toBeCloseTo(0, 10);
  });
  it("computes slope, SE and interval for a known series", () => {
    const r = olsT([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(r.slopePerYear).toBeCloseTo(0.6, 10);
    expect(r.se).toBeCloseTo(0.2828427, 6);
    expect(r.df).toBe(3);
    expect(r.ci95PerDecade).toBeCloseTo(tQuantile(0.975, 3) * 0.2828427 * 10, 6);
    expect(r.tCrit).toBeCloseTo(3.182446, 5);
  });
});

describe("Mann-Kendall", () => {
  it("monotonic series", () => {
    const r = mkOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(r.s).toBe(45);
    expect(r.variance).toBeCloseTo(125, 10);
    expect(r.p).toBeLessThan(0.001);
  });
  it("ties reduce the variance", () => {
    expect(mkOf([1, 1, 2, 3]).variance).toBeCloseTo((4 * 3 * 13 - 2 * 1 * 9) / 18, 10);
  });
});

function synth(perYear: number, years = 45, noise = 0.15): MonthValue[] {
  const out: MonthValue[] = [];
  for (let y = 1981; y < 1981 + years; y++)
    for (let m = 1; m <= 12; m++)
      out.push({ year: y, month: m, value: 20 + 4 * Math.cos((2 * Math.PI * (m - 1)) / 12) + perYear * (y - 1981) + noise * Math.sin(y * 7.1 + m * 3.3) });
  return out;
}

describe("analyze", () => {
  it("defaults to 1981-2025, total change over 44 years", () => {
    const a = analyze(synth(0.04));
    if (!a.ok) throw new Error(a.error);
    expect(a.startYear).toBe(1981);
    expect(a.endYear).toBe(2025);
    expect(a.annual).toHaveLength(45);
    expect(a.trend.perDecade).toBeCloseTo(0.4, 2);
    expect(a.totalChange).toBeCloseTo(a.trend.slopePerYear * 44, 10);
    expect(a.climatology).toHaveLength(12);
    expect(Math.max(...a.residual.map((r) => Math.abs(r.value)))).toBeLessThan(0.4);
  });
  it("rejects periods under 10 years", () => {
    const a = analyze(synth(0.04), { startYear: 2016, endYear: 2024 });
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.error).toBe(TOO_SHORT);
  });
  it("DJF uses December of the previous year and needs all three months", () => {
    const months: MonthValue[] = [
      { year: 1999, month: 12, value: 10 },
      { year: 2000, month: 1, value: 20 },
      { year: 2000, month: 2, value: 30 },
      { year: 2000, month: 12, value: 99 },
      { year: 2001, month: 1, value: 1 },
    ];
    expect(periodMeans(months, "DJF", 2000, 2001)).toEqual([{ year: 2000, value: 20 }]);
  });
  it("annual means skip incomplete years", () => {
    const m = synth(0).filter((p) => !(p.year === 1990 && p.month === 5));
    const a = analyze(m);
    if (!a.ok) throw new Error(a.error);
    expect(a.annual.find((x) => x.year === 1990)).toBeUndefined();
  });
  it("anomalies are relative to the 1981-2010 mean", () => {
    const a = analyze(synth(0, 45, 0));
    if (!a.ok) throw new Error(a.error);
    expect(Math.abs(a.anomalies[10].value)).toBeLessThan(1e-9);
  });
});

describe("verdict", () => {
  /* Synthetic inputs that exercise each rule; the slopes, intervals and p values are not data. */
  const v = (perDecade: number, ci: number, pReg: number, pMk: number, pAdj = pReg, sen = perDecade) =>
    verdict({
      trend: { perDecade, ci95PerDecade: ci, ciLow: perDecade - ci, ciHigh: perDecade + ci, p: pReg, pAdj } as never,
      mk: { p: pMk, senPerDecade: sen } as never,
    });
  it("stays Inconclusive when the autocorrelation adjusted p is not significant, and says why", () => {
    const r = v(0.5, 0.14, 0.001, 0.001, 0.2);
    expect(r.confidence).toBe("Inconclusive");
    expect(r.downgradedBecause).toContain("autocorrelation");
  });
  it("stays Inconclusive when Theil-Sen falls outside the regression interval", () => {
    const r = v(0.5, 0.14, 0.001, 0.001, 0.001, 0.9);
    expect(r.confidence).toBe("Inconclusive");
    expect(r.downgradedBecause).toContain("Theil-Sen");
  });
  it("High needs regression p < 0.01, a narrow interval and Mann-Kendall agreeing", () => {
    expect(v(0.5, 0.14, 0.0001, 0.0001).confidence).toBe("High");
    expect(v(0.5, 0.3, 0.0001, 0.0001).confidence).toBe("Medium");
  });
  it("Medium for regression p < 0.05 when both methods agree", () => {
    expect(v(0.3, 0.2, 0.03, 0.02).confidence).toBe("Medium");
  });
  it("Inconclusive when regression p >= 0.05 or the interval crosses zero", () => {
    expect(v(0.1, 0.05, 0.2, 0.3).confidence).toBe("Inconclusive");
    expect(v(0.1, 0.15, 0.01, 0.01).confidence).toBe("Inconclusive");
  });
  it("methods disagreeing on significance forces Inconclusive and is reported", () => {
    const a = v(0.3, 0.2, 0.03, 0.2);
    expect(a.confidence).toBe("Inconclusive");
    expect(a.methodsAgree).toBe(false);
    const b = v(0.1, 0.12, 0.2, 0.01);
    expect(b.confidence).toBe("Inconclusive");
    expect(b.methodsAgree).toBe(false);
  });
  it("direction follows the slope", () => {
    expect(v(-0.12, 0.2, 0.4, 0.5).direction).toBe("down");
    expect(v(0.12, 0.2, 0.4, 0.5).direction).toBe("up");
  });
});

describe("colors", () => {
  it("hits the ramp stops and clamps", () => {
    expect(colorFor(0.375).toUpperCase()).toBe("#E9E7E1");
    expect(colorFor(-0.5).toUpperCase()).toBe("#2D5FD6");
    expect(colorFor(2).toUpperCase()).toBe("#9B1C24");
    expect(binFor(0)).toBe("#3c71dc");
    expect(binFor(0.74)).toBe("#bd372d");
    expect(stripeColor(0).toUpperCase()).toBe("#E9E7E1");
    expect(stripeColor(5)).toBe(colorFor(0.75));
    expect(stripeColor(-5)).toBe(colorFor(0));
  });
});

describe("parsers", () => {
  it("POWER: skips 13 keys and fill values, for any variable", () => {
    for (const code of ["T2M", "PRECTOTCORR", "RH2M", "WS2M"] as const) {
      const m = parsePowerMonthly({ header: { fill_value: -999 }, properties: { parameter: { [code]: { "198101": 1.5, "198102": -999, "198113": 9.9 } } } }, code);
      expect(m).toEqual([{ year: 1981, month: 1, value: 1.5 }]);
    }
  });
  it("POWER: reads only the requested parameter", () => {
    const json = { properties: { parameter: { T2M: { "198101": 1 }, RH2M: { "198101": 2 } } } };
    expect(parsePowerMonthly(json, "RH2M")).toEqual([{ year: 1981, month: 1, value: 2 }]);
  });
  it("POWER URL switches the parameter", () => {
    expect(powerUrl(-21, -49.375, "PRECTOTCORR")).toContain("parameters=PRECTOTCORR&community=RE");
  });
  it("keeps complete years only", () => {
    const full = Array.from({ length: 12 }, (_, i) => ({ year: 1981, month: i + 1, value: 1 }));
    const part = [{ year: 1982, month: 1, value: 1 }];
    expect(completeYears([...full, ...part])).toHaveLength(12);
  });
  it("POWER cell rounds to the 0.5 x 0.625 grid", () => {
    expect(powerCell(-20.81, -49.38)).toEqual({ lat: -21, lon: -49.375 });
  });
  it("GISTEMP: monthly, complete years only, stops at the last full year", () => {
    const csv = "Land-Ocean: Global Means\nYear,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec,J-D,D-N,DJF,MAM,JJA,SON\n2024,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1\n2025,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2\n2026,3,3,3,***,***,***,***,***,***,***,***,***,***,***,3,3,***,***";
    const g = parseGistempMonthly(csv);
    expect(g.firstYear).toBe(2024);
    expect(g.lastYear).toBe(2025);
    expect(g.months).toHaveLength(24);
  });
});

import { aggregate, regionOf, REGIONS, CAPITALS } from "@/lib/data/brazil";

describe("Brazil aggregation", () => {
  // Synthetic trends for testing only: compute live, never hardcode in the UI.
  const points = [
    { lat: -30.5, lon: -52.5, state: "RS", trend: 0.1 },
    { lat: -29.5, lon: -51.5, state: "RS", trend: 0.2 },
    { lat: -21.5, lon: -49.5, state: "SP", trend: 0.5 },
    { lat: -10.5, lon: -48.5, state: "TO", trend: 0.6 },
  ];
  const caps = { RS: 0.3, SP: 0.4, TO: 0.6, DF: 0.45 };
  const a = aggregate(points, caps, { RS: "Rio Grande do Sul" });
  it("state = mean of its grid points plus the capital", () => {
    const rs = a.states.find((s) => s.sigla === "RS")!;
    expect(rs.value).toBeCloseTo((0.1 + 0.2 + 0.3) / 3, 10);
    expect(rs.gridPoints).toBe(2);
  });
  it("a state with no grid point rests on its capital", () => {
    const df = a.states.find((s) => s.sigla === "DF")!;
    expect(df.gridPoints).toBe(0);
    expect(df.value).toBeCloseTo(0.45, 10);
  });
  it("region uses grid points only, with min, max and count", () => {
    const s = a.regions.find((r) => r.id === "S")!;
    expect(s.mean).toBeCloseTo(0.15, 10);
    expect(s.min).toBe(0.1);
    expect(s.max).toBe(0.2);
    expect(s.count).toBe(2);
  });
  it("national mean covers every grid point", () => {
    expect(a.national.count).toBe(4);
    expect(a.national.mean).toBeCloseTo(0.35, 10);
  });
  it("27 capitals, 5 regions, every state in exactly one region", () => {
    expect(Object.keys(CAPITALS)).toHaveLength(27);
    expect(Object.values(REGIONS).flatMap((r) => r.states).sort()).toEqual(Object.keys(CAPITALS).sort());
    expect(regionOf("DF")).toBe("CW");
  });
});

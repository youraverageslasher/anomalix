import { describe, expect, it } from "vitest";
import { acceleration, ar1Adjust, lag1, residualSd, theilSenAgrees } from "@/lib/data/rigor";
import { olsT } from "@/lib/data/analyze";
import { senSlope } from "@/lib/stats";

/* Synthetic test inputs only, never shown in the UI. */
describe("Theil-Sen", () => {
  it("is the median pairwise slope and ignores one outlier", () => {
    const xs = [0, 1, 2, 3, 4, 5, 6];
    expect(senSlope(xs, [0, 1, 2, 3, 4, 5, 60])).toBe(1);
  });
  it("agrees only with the same sign and inside the interval", () => {
    expect(theilSenAgrees(0.3, 0.32, 0.2, 0.44)).toBe(true);
    expect(theilSenAgrees(0.6, 0.32, 0.2, 0.44)).toBe(false);
    expect(theilSenAgrees(-0.1, 0.05, -0.2, 0.3)).toBe(false);
  });
});

describe("AR(1) adjustment", () => {
  it("leaves N untouched when r1 is not positive", () => {
    const a = ar1Adjust(0.02, 0.005, 40, -0.2);
    expect(a.nEff).toBe(40);
    expect(a.seAdj).toBeCloseTo(0.005, 12);
  });
  it("shrinks N, widens the standard error and raises p when r1 is positive", () => {
    const n = 40;
    const r1 = 0.5;
    const a = ar1Adjust(0.02, 0.005, n, r1);
    expect(a.nEff).toBeCloseTo((n * (1 - r1)) / (1 + r1), 10);
    expect(a.seAdj).toBeCloseTo(0.005 * Math.sqrt((n - 2) / (a.nEff - 2)), 12);
    const plain = ar1Adjust(0.02, 0.005, n, 0);
    expect(a.pAdj).toBeGreaterThan(plain.pAdj);
  });
  it("floors the effective size at 5", () => {
    expect(ar1Adjust(0.02, 0.005, 20, 0.95).nEff).toBe(5);
  });
  it("lag 1 of a slow wave is positive, of an alternating series negative", () => {
    const k = Array.from({ length: 30 }, (_, i) => i);
    expect(lag1(k.map((i) => Math.sin(i / 3)))).toBeGreaterThan(0.5);
    expect(lag1(k.map((i) => (i % 2 ? 1 : -1)))).toBeLessThan(-0.8);
  });
});

describe("residual SD", () => {
  it("uses n - 2 degrees of freedom", () => {
    expect(residualSd([1, -1, 1, -1])).toBeCloseTo(Math.sqrt(4 / 2), 12);
  });
  it("matches the value carried on the OLS fit", () => {
    const xs = Array.from({ length: 20 }, (_, i) => i);
    const ys = xs.map((x) => 0.1 * x + (x % 2 ? 0.3 : -0.3));
    const t = olsT(xs, ys);
    expect(t.residualSd).toBeGreaterThan(0.25);
    expect(t.residualSd).toBeLessThan(0.35);
  });
});

describe("acceleration", () => {
  const series = (f: (i: number) => number, n = 40) => Array.from({ length: n }, (_, i) => ({ year: 1990 + i, value: f(i) + (i % 2 ? 0.01 : -0.01) }));
  it("steady for a straight line", () => {
    const s = series((i) => 0.03 * i);
    expect(acceleration(s, olsT(s.map((p) => p.year), s.map((p) => p.value)).perDecade)?.pace).toBe("steady");
  });
  it("accelerating when the last years climb much faster", () => {
    const s = series((i) => (i < 25 ? 0.01 * i : 0.25 + 0.1 * (i - 25)));
    expect(acceleration(s, olsT(s.map((p) => p.year), s.map((p) => p.value)).perDecade)?.pace).toBe("accelerating");
  });
  it("slowing in the mirror case", () => {
    const s = series((i) => (i < 25 ? 0.1 * i : 2.5 + 0.0 * (i - 25)));
    expect(acceleration(s, olsT(s.map((p) => p.year), s.map((p) => p.value)).perDecade)?.pace).toBe("slowing");
  });
  it("needs more points than the window", () => {
    expect(acceleration(series((i) => i, 15), 1)).toBeNull();
  });
});

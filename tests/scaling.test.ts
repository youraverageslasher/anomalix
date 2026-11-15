import { describe, expect, it } from "vitest";
import { patternScaling } from "@/lib/data/scaling";

/* Synthetic test inputs only, never shown in the UI. */
const yrs = (n: number) => Array.from({ length: n }, (_, i) => 1981 + i);

describe("pattern scaling", () => {
  it("recovers beta for a local series that is twice the global one", () => {
    const g = yrs(40).map((year, i) => ({ year, value: 0.02 * i + Math.sin(i) * 0.1 }));
    const l = g.map((p, i) => ({ year: p.year, value: 2 * p.value + (i % 2 ? 0.01 : -0.01) }));
    const s = patternScaling(l, g)!;
    expect(s.beta).toBeCloseTo(2, 1);
    expect(s.r2).toBeGreaterThan(0.95);
    expect(s.movesWith).toBe(true);
    expect(s.x.reduce((a, b) => a + b, 0)).toBeCloseTo(0, 10);
  });
  it("uses the common years only and hides below 25", () => {
    const g = yrs(40).map((year) => ({ year, value: year }));
    const l = yrs(40).slice(20).map((year) => ({ year, value: year }));
    expect(patternScaling(l, g)).toBeNull();
    expect(patternScaling(yrs(30).map((year) => ({ year, value: year % 3 })), g)?.reference).toEqual({ from: 1981, to: 2010 });
  });
  it("a shared trend gives a high R squared but the detrended link can be near zero", () => {
    const g = yrs(40).map((year, i) => ({ year, value: 0.02 * i + (i % 2 ? 0.05 : -0.05) }));
    const l = yrs(40).map((year, i) => ({ year, value: 0.04 * i + (i % 4 < 2 ? 0.05 : -0.05) }));
    const s = patternScaling(l, g)!;
    expect(s.r2).toBeGreaterThan(0.8);
    expect(Math.abs(s.detrendedR)).toBeLessThan(0.2);
  });
  it("noise without a shared signal does not move with the planet", () => {
    const g = yrs(40).map((year, i) => ({ year, value: 0.02 * i }));
    const l = yrs(40).map((year, i) => ({ year, value: ((i * 37) % 11) / 10 }));
    expect(patternScaling(l, g)!.movesWith).toBe(false);
  });
});

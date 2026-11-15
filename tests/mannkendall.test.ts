import { describe, expect, it } from "vitest";
import { mannKendallTest } from "@/lib/data/mannkendall";

/* Small known series checked by hand: these are textbook inputs, not data shown in the app. */
describe("Mann-Kendall test", () => {
  it("a strictly rising series of five points", () => {
    const r = mannKendallTest([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]);
    expect(r.s).toBe(10);
    expect(r.variance).toBeCloseTo((5 * 4 * 15) / 18, 12);
    expect(r.z).toBeCloseTo(9 / Math.sqrt((5 * 4 * 15) / 18), 12);
    expect(r.p).toBeCloseTo(0.0275, 3);
    expect(r.senPerYear).toBe(1);
    expect(r.senPerDecade).toBe(10);
  });
  it("applies the tie correction and the continuity correction", () => {
    const r = mannKendallTest([1, 2, 3, 4], [1, 2, 2, 3]);
    expect(r.s).toBe(5);
    expect(r.variance).toBeCloseTo((4 * 3 * 13 - 2 * 1 * 9) / 18, 12);
    expect(r.z).toBeCloseTo(4 / Math.sqrt((4 * 3 * 13 - 2 * 1 * 9) / 18), 12);
    expect(r.p).toBeGreaterThan(0.05);
  });
  it("falling series gives a negative S, Z and Sen slope", () => {
    const r = mannKendallTest([1, 2, 3, 4, 5, 6], [6, 5, 4, 3, 2, 1]);
    expect(r.s).toBe(-15);
    expect(r.z).toBeLessThan(0);
    expect(r.senPerYear).toBe(-1);
  });
  it("a flat series has S = 0 and p = 1", () => {
    const r = mannKendallTest([1, 2, 3, 4], [2, 2, 2, 2]);
    expect(r.s).toBe(0);
    expect(r.p).toBe(1);
  });
});

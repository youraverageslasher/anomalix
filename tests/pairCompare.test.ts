import { afterEach, describe, expect, it, vi } from "vitest";
import { compareSlopes, isLinked, linkWarning, parsePlaceParam, pearson, placeParam, sameCell } from "@/lib/data/pairCompare";
import { comparePlaces } from "@/lib/data/report";

afterEach(() => vi.unstubAllGlobals());

describe("slope difference z test", () => {
  it("uses standard errors: delta 0.4, SE sqrt(0.3² + 0.4²) = 0.5, z 0.8, p 0.4237", () => {
    const c = compareSlopes({ perDecade: 0.5, sePerDecade: 0.3 }, { perDecade: 0.1, sePerDecade: 0.4 });
    expect(c.delta).toBeCloseTo(0.4, 12);
    expect(c.seDelta).toBeCloseTo(0.5, 12);
    expect(c.z).toBeCloseTo(0.8, 12);
    expect(c.p).toBeCloseTo(0.4237, 3);
    expect(c.half95).toBeCloseTo(0.98, 12);
    expect(c.significant).toBe(false);
  });
  it("SJRP-like against Delhi-like slopes: significant, p < 0.001", () => {
    const c = compareSlopes({ perDecade: 0.509, sePerDecade: 0.0665 }, { perDecade: -0.12, sePerDecade: 0.0685 });
    expect(c.delta).toBeCloseTo(0.629, 3);
    expect(c.z).toBeGreaterThan(6);
    expect(c.p).toBeLessThan(0.001);
    expect(c.significant).toBe(true);
  });
});

describe("correlation and the linked warning", () => {
  it("Pearson r on known series", () => {
    expect(pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])).toBeCloseTo(1, 12);
    expect(pearson([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBeCloseTo(-1, 12);
    expect(pearson([1, 2, 3, 4], [1, 3, 2, 4])).toBeCloseTo(0.8, 12);
  });
  it("warns at r >= 0.5 only, with the agreed text", () => {
    expect(isLinked(0.5)).toBe(true);
    expect(isLinked(0.49)).toBe(false);
    expect(isLinked(NaN)).toBe(false);
    expect(linkWarning(0.874)).toBe(
      "These places are climatically linked (r = 0.87): their series move together, so this test overstates significance. Treat the result as an upper bound.",
    );
  });
});

describe("same grid cell", () => {
  it("detects two points in one 0.5 by 0.625 cell, and different neighbors", () => {
    expect(sameCell({ lat: -20.81972, lon: -49.37944 }, { lat: -20.9, lon: -49.2 })).toBe(true);
    expect(sameCell({ lat: -20.81972, lon: -49.37944 }, { lat: -21.17, lon: -47.81 })).toBe(false);
  });
  it("blocks the comparison before any request", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const r = await comparePlaces({ name: "A", lat: -20.81972, lon: -49.37944 }, { name: "A again", lat: -20.81972, lon: -49.37944 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("same-cell");
    expect(f).not.toHaveBeenCalled();
  });
});

describe("compare uses only the years both places share", () => {
  it("drops a year that is incomplete at one place and correlates the anomalies", async () => {
    const series = (shift: number, gapYear?: number) => {
      const o: Record<string, number> = {};
      for (let y = 1981; y <= 2025; y++)
        for (let m = 1; m <= 12; m++) o[`${y}${String(m).padStart(2, "0")}`] = y === gapYear && m === 6 ? -999 : 20 + shift + 0.03 * (y - 1981) + Math.sin(y * 1.7) * 0.4 + m * 0.1;
      return o;
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const lat = Number(new URL(url).searchParams.get("latitude"));
        const data = lat > 0 ? series(5, 1990) : series(0);
        return new Response(JSON.stringify({ header: { fill_value: -999 }, properties: { parameter: { T2M: data } }, geometry: { coordinates: [0, 0, 100] } }));
      }),
    );
    const r = await comparePlaces({ name: "South", lat: -40.3, lon: 10.1 }, { name: "North", lat: 40.3, lon: 10.1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.years).not.toContain(1990);
    expect(r.data.years.length).toBe(44);
    expect(r.data.a.analysis.annual.map((x) => x.year)).toEqual(r.data.years);
    expect(r.data.b.analysis.annual.map((x) => x.year)).toEqual(r.data.years);
    expect(r.data.r).toBeGreaterThan(0.99);
    expect(r.data.linked).toBe(true);
    expect(Math.abs(r.data.comparison.delta)).toBeLessThan(1e-9);
  });
});

describe("place parameter", () => {
  it("round-trips names with commas", () => {
    const p = { lat: -20.81972, lon: -49.37944, name: "São José do Rio Preto, SP" };
    expect(parsePlaceParam(placeParam(p))).toEqual({ lat: -20.8197, lon: -49.3794, name: "São José do Rio Preto, SP" });
    expect(parsePlaceParam("abc")).toBeNull();
    expect(parsePlaceParam("95,10,x")).toBeNull();
  });
});

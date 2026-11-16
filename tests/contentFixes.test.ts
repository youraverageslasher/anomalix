import { describe, expect, it } from "vitest";
import { pullingSeason, type SeasonFit } from "@/lib/data/seasons";
import { cellKm, cellText } from "@/lib/data/cell";

const fit = (id: string, perDecade: number, strict = true) => ({ id, label: id, strict, trend: { perDecade } }) as unknown as SeasonFit;

describe("season pulling the trend", () => {
  it("falling year: the largest decline among strict seasons (SJRP RH2M picks Jun to Aug)", () => {
    const fits = [fit("Dec to Feb", -1.87), fit("Mar to May", -1.2), fit("Jun to Aug", -4.06), fit("Sep to Nov", -0.4, false)];
    expect(pullingSeason(fits, -1)?.id).toBe("Jun to Aug");
  });
  it("falling year: SJRP PRECTOTCORR picks Dec to Feb over Mar to May", () => {
    expect(pullingSeason([fit("Dec to Feb", -0.734), fit("Mar to May", -0.473), fit("Jun to Aug", -0.9, false)], -1)?.id).toBe("Dec to Feb");
  });
  it("rising year: the largest rise, ignoring declines and non-strict seasons", () => {
    expect(pullingSeason([fit("A", 0.3), fit("B", 0.6), fit("C", -1.5), fit("D", 0.9, false)], 1)?.id).toBe("B");
  });
  it("inconclusive year: the largest magnitude either way", () => {
    expect(pullingSeason([fit("A", 0.3), fit("C", -1.5)], 0)?.id).toBe("C");
  });
  it("no strict season in the trend's direction: none", () => {
    expect(pullingSeason([fit("A", 0.5)], -1)).toBeNull();
  });
});

describe("grid cell size by latitude", () => {
  it("equator, São José do Rio Preto and Longyearbyen", () => {
    expect(cellKm(0)).toEqual({ ns: 56, ew: 70 });
    expect(cellKm(-20.81972)).toEqual({ ns: 56, ew: 65 });
    expect(cellKm(78.22334)).toEqual({ ns: 56, ew: 14 });
    expect(cellText(-20.81972)).toBe("56 × 65 km");
  });
});

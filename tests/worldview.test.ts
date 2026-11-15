import { describe, expect, it } from "vitest";
import { hottestMonth, validCoords, worldviewUrl } from "@/lib/data/worldview";
import type { MonthValue } from "@/lib/data/types";

/* Synthetic test inputs only, never shown in the UI. */
const months = (from: number, to: number, f: (y: number, m: number) => number): MonthValue[] =>
  Array.from({ length: (to - from + 1) * 12 }, (_, i) => ({ year: from + Math.floor(i / 12), month: (i % 12) + 1, value: f(from + Math.floor(i / 12), (i % 12) + 1) }));

describe("Worldview link", () => {
  it("picks the largest positive anomaly against the month's own mean, only from imagery years", () => {
    const m = months(1990, 2010, (y, mo) => 20 + mo * 0.1 + (y === 1995 && mo === 7 ? 9 : 0) + (y === 2008 && mo === 3 ? 3 : 0));
    expect(hottestMonth(m)).toMatchObject({ year: 2008, month: 3, date: "2008-03-15" });
  });
  it("respects the layer start inside 2000", () => {
    const m = months(1995, 2001, (y, mo) => (y === 2000 && mo === 2 ? 30 : y === 2001 && mo === 6 ? 21 : 20));
    expect(hottestMonth(m)?.date).toBe("2001-06-15");
  });
  it("returns null when no month after 2000 is above its mean", () => {
    expect(hottestMonth(months(1990, 2005, (y) => (y < 2000 ? 30 : 10)))).toBeNull();
  });
  it("skips months in polar night", () => {
    const m = months(2001, 2010, (y, mo) => (y === 2005 && mo === 1 ? 9 : y === 2006 && mo === 7 ? 3 : 0));
    expect(hottestMonth(m, undefined, 78.2)?.date).toBe("2006-07-15");
    expect(hottestMonth(m, undefined, -20)?.date).toBe("2005-01-15");
  });
  it("builds the official parameters", () => {
    expect(worldviewUrl(-20.8, -49.4, "2023-12-15")).toBe(
      "https://worldview.earthdata.nasa.gov/?v=-50.9000,-22.3000,-47.9000,-19.3000&t=2023-12-15&l=MODIS_Terra_CorrectedReflectance_TrueColor,Coastlines_15m",
    );
    expect(validCoords(95, 0)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { dayNightPattern, PATTERN_LINE, type ExtremeFit } from "@/lib/data/daynight";
import { parsePowerMonthly, completeYears, EXTREMES } from "@/lib/data/power";
import { coverage } from "@/lib/data/range";

/* Synthetic test inputs only, never shown in the UI. */
const fit = (perDecade: number, ci: number, sig: boolean): ExtremeFit =>
  ({ code: "T2M_MAX", coverage: null, span: null, annual: [], trend: { perDecade, ci95PerDecade: ci } as never, verdict: { confidence: sig ? "Medium" : "Inconclusive" } as never }) as ExtremeFit;

describe("days vs nights", () => {
  it("nights faster only beyond the combined intervals", () => {
    expect(dayNightPattern(fit(0.2, 0.05, true), fit(0.4, 0.05, true))).toBe("nights");
    expect(dayNightPattern(fit(0.2, 0.1, true), fit(0.35, 0.1, true))).toBe("none");
  });
  it("days faster in the mirror case", () => {
    expect(dayNightPattern(fit(0.5, 0.05, true), fit(0.2, 0.05, true))).toBe("days");
  });
  it("no claim when either trend is not significant", () => {
    expect(dayNightPattern(fit(0.5, 0.05, true), fit(0.1, 0.05, false))).toBe("none");
  });
  it("the lines name patterns, never causes", () => {
    expect(PATTERN_LINE.nights).toMatch(/pattern often linked/);
    expect(PATTERN_LINE.days).toMatch(/pattern often linked/);
  });
});

describe("T2M_MAX and T2M_MIN parsing", () => {
  it("filters YYYY13 and -999 per parameter, each with its own year range", () => {
    const T2M_MAX: Record<string, number> = {};
    const T2M_MIN: Record<string, number> = {};
    for (let y = 2001; y <= 2010; y++) {
      for (let m = 1; m <= 12; m++) {
        const k = `${y}${String(m).padStart(2, "0")}`;
        T2M_MAX[k] = y < 2004 ? -999 : 30;
        T2M_MIN[k] = 18;
      }
      T2M_MAX[`${y}13`] = 9999;
      T2M_MIN[`${y}13`] = 9999;
    }
    const json = { header: { fill_value: -999 }, properties: { parameter: { T2M_MAX, T2M_MIN } } };
    const [max, min] = EXTREMES.map((k) => parsePowerMonthly(json, k));
    for (const s of [max, min]) expect(s.some((p) => p.value <= -900 || p.value === 9999)).toBe(false);
    expect(coverage(max)?.firstValid).toBe(2004);
    expect(coverage(min)?.firstValid).toBe(2001);
    expect(completeYears(max).length).toBe(7 * 12);
  });
});

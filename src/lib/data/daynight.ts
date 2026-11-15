import type { TrendFit } from "./analyze";
import type { Verdict } from "./verdict";
import type { Coverage, Span } from "./range";

export interface ExtremeFit {
  code: "T2M_MAX" | "T2M_MIN";
  coverage: Coverage | null;
  span: Span | null;
  trend: TrendFit;
  verdict: Verdict;
  /* Yearly means of the monthly values, complete years only (for T2M_MAX: the average daily high). */
  annual: { year: number; value: number }[];
}

export type DayNightPattern = "nights" | "days" | "none";

/*
 * A difference is named only when both trends are significant and the slopes differ by more than their
 * combined 95% half widths. These are patterns, never causes.
 */
export function dayNightPattern(max: ExtremeFit, min: ExtremeFit): DayNightPattern {
  if (max.verdict.confidence === "Inconclusive" || min.verdict.confidence === "Inconclusive") return "none";
  const gap = min.trend.perDecade - max.trend.perDecade;
  const combined = max.trend.ci95PerDecade + min.trend.ci95PerDecade;
  if (Math.abs(gap) <= combined) return "none";
  return gap > 0 ? "nights" : "days";
}

export const PATTERN_LINE: Record<DayNightPattern, string> = {
  nights: "Nights warm faster than days, a pattern often linked to trapped heat, humidity or urban heat.",
  days: "Days warm faster than nights, a pattern often linked to drier soil and less evaporation.",
  none: "No clear difference between days and nights.",
};

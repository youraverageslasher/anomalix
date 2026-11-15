import type { Analysis } from "./analyze";
import { theilSenAgrees } from "./rigor";

export type Confidence = "High" | "Medium" | "Inconclusive";
export type Direction = "up" | "down";

export interface Verdict {
  confidence: Confidence;
  direction: Direction;
  crossesZero: boolean;
  /* Significance at 0.05 by each method, and whether they agree. */
  regressionSignificant: boolean;
  mkSignificant: boolean;
  methodsAgree: boolean;
  /* Extra rigor: Theil-Sen inside the OLS interval with the same sign, and the AR(1) adjusted p. */
  theilSenAgrees: boolean;
  adjustedSignificant: boolean;
  /* Set when the regression alone would be significant but a stricter check is not; the verdict is then Inconclusive. */
  downgradedBecause: string | null;
}

/*
 * The headline rests on the regression: significant only when its p < 0.05 and the 95% interval excludes zero.
 * Mann-Kendall is the second opinion: when the two methods disagree on significance, the verdict is Inconclusive.
 * High confidence also needs p < 0.01 and an interval narrower than half the slope.
 * Conservative layer: when the regression would be significant but Theil-Sen disagrees or the p value adjusted for
 * autocorrelation is not below 0.05, the verdict stays Inconclusive and says why. The seal rules are unchanged.
 */
export function verdict(a: Pick<Analysis, "trend" | "mk">): Verdict {
  const { perDecade, ci95PerDecade, ciLow, ciHigh, p } = a.trend;
  const crossesZero = ciLow <= 0 && ciHigh >= 0;
  const direction: Direction = perDecade >= 0 ? "up" : "down";
  const regressionSignificant = p < 0.05 && !crossesZero;
  const mkSignificant = a.mk.p < 0.05;
  const methodsAgree = regressionSignificant === mkSignificant;
  const ts = theilSenAgrees(a.mk.senPerDecade, perDecade, ciLow, ciHigh);
  const adjustedSignificant = a.trend.pAdj < 0.05;
  let confidence: Confidence = "Inconclusive";
  let downgradedBecause: string | null = null;
  if (regressionSignificant && methodsAgree) {
    if (!adjustedSignificant) downgradedBecause = "the p value adjusted for autocorrelation is not below 0.05";
    else if (!ts) downgradedBecause = "the Theil-Sen median slope falls outside the regression interval";
    else confidence = p < 0.01 && ci95PerDecade < Math.abs(perDecade) / 2 ? "High" : "Medium";
  }
  return { confidence, direction, crossesZero, regressionSignificant, mkSignificant, methodsAgree, theilSenAgrees: ts, adjustedSignificant, downgradedBecause };
}

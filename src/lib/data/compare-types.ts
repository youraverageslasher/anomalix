import type { MannKendallTest } from "./mannkendall";
import type { Place } from "./types";
import type { Verdict } from "./verdict";

export type CompareRow =
  | {
      place: Place;
      ok: true;
      perDecade: number;
      ci95: number;
      /* Regression p value; the Mann-Kendall check travels beside it. */
      p: number;
      mk: MannKendallTest;
      verdict: Verdict;
      anomalies: { year: number; value: number }[];
    }
  | { place: Place; ok: false; error: string };

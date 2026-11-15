"use client";

import { BigStats } from "@/components/v6/Stats";
import { intLabel } from "@/lib/data/fmt";
import { useHomeSpan } from "./useCompare";

export function HomeStats({ gridCount }: { gridCount: number }) {
  const span = useHomeSpan();
  return (
    <BigStats
      stats={[
        { value: span?.n ?? NaN, format: (v) => (Number.isFinite(v) ? intLabel(v) : "…"), label: "Years", line: span ? `Complete years of NASA reanalysis, ${span.from} to ${span.to}` : "Read from the live NASA response" },
        { value: gridCount, format: (v) => intLabel(v), label: "Grid points", line: "Behind the Brazil deep dive" },
        { value: 2, format: (v) => intLabel(v), label: "NASA sources", line: "POWER and GISTEMP, open and keyless" },
        /* A claim, not data: measured on a home connection on 15 Nov 2026 at about 2 s from typed name to verdict
           (Open-Meteo geocode under 1 s cold, NASA POWER point request 0.3 to 0.7 s). Kept as an upper bound. */
        { value: 10, format: (v) => `< ${Math.max(1, Math.round(v))} s`, label: "To a verdict", line: "From typed name to full report" },
      ]}
    />
  );
}

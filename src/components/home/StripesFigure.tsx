"use client";

import { BASELINE_LABEL } from "@/lib/data/analyze";
import { Figure } from "@/components/v6/Figure";
import { Stripes } from "@/components/v6/Stripes";
import { useCompare } from "./useCompare";

export function StripesFigure() {
  const data = useCompare();
  const row = data.status === "ready" ? data.rows.find((r) => r.place.name === "São José do Rio Preto") : undefined;
  const series = row && row.ok ? row.anomalies : null;
  const first = series?.[0]?.year;
  const last = series?.[series.length - 1]?.year;
  const mid = first !== undefined && last !== undefined ? Math.round((first + last) / 2) : undefined;
  return (
    <Figure
      n={2}
      title={`One stripe per year · São José do Rio Preto${first !== undefined ? `, ${first}-${last}` : ""}`}
      caption={`Each stripe is one year compared with the ${BASELINE_LABEL} average. Blue years ran cooler, red years warmer.`}
      source={`NASA POWER (MERRA-2)${first !== undefined ? `, ${first}-${last}` : ""}.`}
    >
      {series ? (
        <>
          <Stripes anomalies={series} height={96} rounded={8} />
          <div className="mt-2 flex justify-between text-[12px] text-muted tnum">
            <span>{first}</span>
            <span>{mid}</span>
            <span>{last}</span>
          </div>
        </>
      ) : data.status === "error" || (row && !row.ok) ? (
        <p role="alert" className="text-[14px] text-body">
          NASA POWER did not answer for this city, so the stripes are not drawn.
        </p>
      ) : (
        <div className="h-[96px] animate-pulse rounded-[8px] bg-track" aria-hidden />
      )}
    </Figure>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { DotMap, type MapMarker } from "@/components/v6/DotMap";
import { Legend } from "@/components/v6/Legend";
import { Pill } from "@/components/ui/Pill";
import { useInView, usePrefersReducedMotion } from "@/components/v6/motion";
import type { SearchState } from "@/lib/useSearchedPlace";
import { signed } from "@/lib/data/fmt";

export function CoverageMap({
  stateValues,
  pointCount,
  nationalMean,
  period,
  globalTrend,
  search,
}: {
  stateValues: Record<string, number>;
  pointCount: number;
  nationalMean: number;
  period: string;
  globalTrend: number | null;
  search: SearchState;
}) {
  const [w, setW] = useState(1312);
  useEffect(() => {
    const set = () => setW(window.innerWidth >= 1024 ? 1312 : 760);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);
  const h = Math.round(w * 0.47);
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "0px 0px -20% 0px" });
  const reduced = usePrefersReducedMotion();

  const place = search.place;
  const markers: MapMarker[] = useMemo(
    () => (place ? [{ id: "place", lat: place.lat, lon: place.lon, tone: "searched", label: place.name.split(",")[0], labelSide: place.lon > 100 ? "left" : "right" }] : []),
    [place],
  );

  return (
    <figure className="overflow-hidden rounded-card border border-rule bg-card shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 md:px-8 md:pt-7">
        <Pill variant="light">SOURCE A · EVERY LAND CELL</Pill>
        <Pill variant="light">
          SOURCE B · ONE GLOBAL SERIES
          {globalTrend !== null && <span className="hidden sm:inline">&nbsp;· {signed(globalTrend)} °C/DECADE</span>}
        </Pill>
      </div>
      <div ref={ref} className="relative mx-auto mt-4 max-w-[1312px] px-2 md:px-6">
        <DotMap
          width={w}
          height={h}
          stateValues={stateValues}
          highlight={search.highlight}
          neutralBrazil={search.foreign}
          markers={markers}
          ariaLabel={`World map in dots: every land cell NASA POWER covers. Brazil is shaded by the mean trend of its ${pointCount} grid points${search.loc?.kind === "brazil" ? `, with ${search.line} highlighted` : ""}.`}
        />
        {!reduced && <div aria-hidden className={`map-veil ${inView ? "is-lit" : ""}`} />}
      </div>
      <figcaption className="grid grid-cols-1 gap-6 border-t border-rule px-5 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
        <p className="max-w-[760px] text-[14px] leading-relaxed text-body">
          <span className="font-semibold text-text">Figure 1.</span> NASA POWER covers every land cell on the map, so any city can be analyzed. Brazil is
          shaded with the {period} trend of its {pointCount} grid points, national mean {signed(nationalMean)} °C per decade.
          {search.loc?.kind === "brazil" ? ` Highlighted: ${search.line}.` : ""}
          {search.foreign && place ? ` The marker shows ${place.name.split(",")[0]}, outside Brazil, so Brazil stays neutral.` : ""} GISTEMP has no map here: it condenses the planet into one series
          {globalTrend !== null ? `, ${signed(globalTrend)} °C per decade over the same years` : ""}.
        </p>
        <Legend nationalMean={nationalMean} />
      </figcaption>
    </figure>
  );
}

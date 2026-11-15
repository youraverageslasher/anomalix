"use client";

import type { Highlight } from "@/lib/data/locate";
import { useEffect, useState } from "react";
import { DotMap } from "@/components/v6/DotMap";
import { useInView, usePrefersReducedMotion } from "@/components/v6/motion";
import { coordText } from "@/lib/data/fmt";

export function InputVisual({ name, lat, lon, stateValues, highlight = null, neutralBrazil = false }: { name: string; lat: number; lon: number; stateValues: Record<string, number>; highlight?: Highlight | null; neutralBrazil?: boolean }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setTyped(name.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(i);
      if (i >= name.length) window.clearInterval(id);
    }, Math.max(28, Math.min(70, 1100 / Math.max(1, name.length))));
    return () => window.clearInterval(id);
  }, [inView, name, reduced]);
  const done = typed >= name.length;

  return (
    <div ref={ref} className="relative">
      <div className="mx-auto flex h-[64px] max-w-[560px] items-center gap-3 rounded-full border border-rule bg-card pl-5 pr-[6px] shadow-float" aria-label={`Search box with ${name}`}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="text-muted">
          <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="min-w-0 flex-1 truncate text-[16px] text-text">
          {name.slice(0, typed)}
          {!done && <span className="type-caret" aria-hidden />}
        </span>
        <span className={`inline-flex h-[52px] items-center rounded-full px-6 text-[15px] font-semibold transition-colors duration-300 ${done ? "bg-text text-bg" : "bg-highlight text-muted"}`}>
          Investigate
        </span>
      </div>
      <div className={`mt-3 flex justify-center gap-3 text-[12.5px] text-muted transition-opacity duration-500 tnum ${done ? "opacity-100" : "opacity-0"}`}>
        <span>Open-Meteo geocoding</span>
        <span aria-hidden>→</span>
        <span className="text-body">{coordText(lat, lon)}</span>
      </div>
      <div className={`mt-6 ${done ? "drop-in" : "drop-wait"}`}>
        <DotMap width={900} height={440} stateValues={stateValues} highlight={highlight} neutralBrazil={neutralBrazil} markers={[{ id: "place", lat, lon, tone: "searched", label: name.split(",")[0] }]} ariaLabel={`World map with a marker on ${name}`} />
      </div>
    </div>
  );
}

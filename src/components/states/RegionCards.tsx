"use client";

import { CountUp, useInView } from "@/components/v6/motion";
import { colorFor } from "@/lib/data/color";
import { intLabel, signed } from "@/lib/data/fmt";
import type { RegionId } from "@/lib/data/brazil";
import type { RegionRow } from "./data";

export function RegionCards({
  regions,
  open,
  onOpen,
  onHover,
  active,
  onActive,
  placeState,
}: {
  regions: RegionRow[];
  open: RegionId | null;
  onOpen: (id: RegionId | null) => void;
  onHover: (id: RegionId | null) => void;
  active: string | null;
  onActive: (s: string | null) => void;
  placeState: string | null;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const max = Math.max(...regions.map((r) => r.max));
  return (
    <div ref={ref} className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {regions.map((r, i) => {
        const isOpen = open === r.id;
        return (
          <article
            key={r.id}
            onMouseEnter={() => onHover(r.id)}
            onMouseLeave={() => onHover(null)}
            className={`region-card rounded-card border bg-card shadow-card transition-colors ${isOpen ? "border-text" : "border-rule hover:border-highlight-border"} ${inView ? "is-in" : ""}`}
            style={{ transitionDelay: `${i * 70}ms` }}
          >
            <button
              type="button"
              onClick={() => onOpen(isOpen ? null : r.id)}
              aria-expanded={isOpen}
              className="w-full p-6 text-left"
            >
              <p className="flex items-center justify-between gap-2 text-[14px] font-medium text-text">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-[11px] w-[11px] rounded-[3px]" style={{ background: colorFor(r.mean) }} />
                  {r.name}
                </span>
                <span aria-hidden className={`text-[16px] text-muted transition-transform ${isOpen ? "rotate-45" : ""}`}>
                  +
                </span>
              </p>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="font-serif text-[46px] leading-none tracking-[-0.02em] text-text tnum">
                  <CountUp value={r.mean} format={(v) => signed(v)} />
                </span>
                <span className="text-[12px] text-muted">°C/decade</span>
              </p>
              <div className="relative mt-5 h-[6px] w-full rounded-full bg-track" aria-hidden>
                <div className="absolute inset-y-0 rounded-full opacity-40" style={{ left: `${(r.min / max) * 100}%`, width: `${((r.max - r.min) / max) * 100}%`, background: colorFor(r.mean) }} />
                <div className="grow-bar absolute inset-y-0 left-0 rounded-full" style={{ width: `${(r.mean / max) * 100}%`, background: colorFor(r.mean) }} />
              </div>
              <p className="mt-4 text-[13px] text-body tnum">
                From {signed(r.min)} to {signed(r.max)}
              </p>
              <p className="mt-1 text-[12.5px] text-muted">
                {intLabel(r.count)} grid points · {r.states.length} states
              </p>
            </button>
            <div className={`region-drawer ${isOpen ? "is-open" : ""}`}>
              <ul className={`space-y-1 px-4 ${isOpen ? "border-t border-rule py-3" : ""}`}>
                {r.states.map((s) => (
                  <li key={s.sigla}>
                    <button
                      type="button"
                      onMouseEnter={() => onActive(s.sigla)}
                      onMouseLeave={() => onActive(null)}
                      onFocus={() => onActive(s.sigla)}
                      onBlur={() => onActive(null)}
                      className={`flex w-full items-center justify-between rounded-[8px] px-2 py-[6px] text-[13.5px] ${active === s.sigla ? "bg-highlight" : ""} ${placeState === s.sigla ? "text-text" : "text-body"}`}
                    >
                      <span className="flex items-center gap-2">
                        {placeState === s.sigla && <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-signal" />}
                        {s.name}
                      </span>
                      <span className="font-serif text-[16px] text-text tnum">{signed(s.value)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        );
      })}
    </div>
  );
}

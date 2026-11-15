"use client";

import { useInView } from "@/components/v6/motion";
import { colorFor } from "@/lib/data/color";
import { signed } from "@/lib/data/fmt";
import type { StateRow } from "./data";

function Row({ s, max, active, pinned, onActive, delay }: { s: StateRow; max: number; active: boolean; pinned: boolean; onActive: (v: string | null) => void; delay: number }) {
  return (
    <li
      onMouseEnter={() => onActive(s.sigla)}
      onMouseLeave={() => onActive(null)}
      onFocus={() => onActive(s.sigla)}
      onBlur={() => onActive(null)}
      tabIndex={0}
      aria-label={`${s.rank}. ${s.name}: ${signed(s.value)} °C per decade${pinned ? ", your search" : ""}`}
      className={`rank-row rank-in relative grid grid-cols-[30px_minmax(0,1fr)_34px_minmax(60px,1.1fr)_64px] items-center gap-3 border-b border-rule px-2 py-[11px] sm:grid-cols-[34px_minmax(0,1.2fr)_38px_minmax(0,1.3fr)_72px] ${active ? "is-active" : ""} ${pinned ? "is-pinned" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {pinned && <span aria-hidden className="absolute inset-y-[6px] left-0 w-[3px] rounded-full bg-signal" />}
      <span className={`text-[12.5px] tnum ${pinned ? "font-semibold text-signal" : "text-muted"}`}>{String(s.rank).padStart(2, "0")}</span>
      <span className="truncate text-[15px] text-text">
        {s.name}
        {pinned && <span className="sr-only"> (your search)</span>}
      </span>
      <span className="text-[12.5px] text-muted">{s.sigla}</span>
      <span className="h-[8px] rounded-full bg-track" aria-hidden>
        <span className="rank-bar block h-full rounded-full" style={{ width: `${(s.value / max) * 100}%`, background: colorFor(s.value), transitionDelay: `${delay + 120}ms` }} />
      </span>
      <span className="text-right font-serif text-[21px] leading-none text-text tnum">{signed(s.value)}</span>
    </li>
  );
}

export function Ranking({ states, active, onActive, placeState }: { states: StateRow[]; active: string | null; onActive: (v: string | null) => void; placeState: string | null }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const max = states[0].value;
  const half = Math.ceil(states.length / 2);
  const cols = [states.slice(0, half), states.slice(half)];
  return (
    <div ref={ref} className={`grid grid-cols-1 gap-x-12 border-t-2 border-text lg:grid-cols-2 ${inView ? "ranking-in" : ""}`}>
      {cols.map((col, c) => (
        <ol key={c} className={c === 1 ? "border-t border-rule lg:border-t-0" : ""}>
          {col.map((s, i) => (
            <Row key={s.sigla} s={s} max={max} active={active === s.sigla} pinned={placeState === s.sigla} onActive={onActive} delay={(c * half + i) * 35} />
          ))}
        </ol>
      ))}
    </div>
  );
}

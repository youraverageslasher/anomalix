"use client";

import { useEffect, useRef, useState } from "react";
import { pLabel, signed, fixed } from "@/lib/data/fmt";
import { useInView, usePrefersReducedMotion } from "@/components/v6/motion";

export interface ForestRow {
  name: string;
  perDecade: number;
  ci95: number;
  p: number;
  inconclusive: boolean;
  searched: boolean;
}

function niceTicks(lo: number, hi: number): number[] {
  const span = hi - lo;
  const raw = span / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= 5) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

export function ForestPlot({ rows, unit = "°C/decade", digits = 2, temperature = true }: { rows: ForestRow[]; unit?: string; digits?: number; temperature?: boolean }) {
  const sorted = [...rows].sort((a, b) => b.perDecade - a.perDecade);
  const lo = Math.min(0, ...sorted.map((r) => r.perDecade - r.ci95));
  const hi = Math.max(0, ...sorted.map((r) => r.perDecade + r.ci95));
  const pad = (hi - lo) * 0.06;
  const d0 = lo - pad;
  const d1 = hi + pad;
  /* Draw at the real container width so the 11 to 12.5px labels never shrink on phones. */
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(520);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(Math.max(300, Math.min(520, Math.round(el.getBoundingClientRect().width)))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = W < 440;
  const LEFT = narrow ? 118 : 150;
  const RIGHT = narrow ? 92 : 110;
  const ROW = 30;
  const H = sorted.length * ROW + 34;
  const x = (v: number) => LEFT + ((v - d0) / (d1 - d0)) * (W - LEFT - RIGHT);
  const ticks = niceTicks(d0, d1).filter((_, i, all) => !narrow || all.length <= 4 || i % 2 === 0);
  const [hover, setHover] = useState<number | null>(null);
  const { ref, inView } = useInView<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const shown = inView || reduced;

  return (
    <div ref={box}>
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Forest plot of ${temperature ? "temperature" : ""} trends with 95% intervals for example cities, in ${unit}`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={4} y2={H - 26} stroke={t === 0 ? "#8D97A6" : "#2B323C"} strokeWidth={1} strokeDasharray={t === 0 ? undefined : "3 4"} />
            <text x={x(t)} y={H - 8} textAnchor="middle" fontSize={11} fill="#8D97A6" className="tnum">
              {t === 0 ? "0" : signed(t, 2)}
            </text>
          </g>
        ))}
        {hover !== null && (
          <line x1={x(sorted[hover].perDecade)} x2={x(sorted[hover].perDecade)} y1={4} y2={H - 26} stroke="#ECEEF1" strokeOpacity={0.5} strokeWidth={1} pointerEvents="none" />
        )}
        {sorted.map((r, i) => {
          const y = 18 + i * ROW;
          const color = r.searched ? "#EF5A4C" : r.inconclusive ? "#8D97A6" : "#ECEEF1";
          return (
            <g key={r.name} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${r.name}: ${signed(r.perDecade, digits)} ± ${fixed(r.ci95, digits)} ${unit}, ${pLabel(r.p)}${r.inconclusive ? ", inconclusive" : ""}`}>
              <rect x={0} y={y - ROW / 2} width={W} height={ROW} fill={hover === i ? "#1B2028" : "transparent"} rx={6} />
              <text x={10} y={y + 4} fontSize={12.5} fontWeight={r.searched ? 600 : 400} fill={r.inconclusive && !r.searched ? "#8D97A6" : "#ECEEF1"}>
                {r.name.length > 22 ? `${r.name.slice(0, 21)}…` : r.name}
              </text>
              <line
                x1={x(r.perDecade - r.ci95)}
                x2={x(r.perDecade + r.ci95)}
                y1={y}
                y2={y}
                stroke={color}
                strokeWidth={r.searched ? 2 : 1.5}
                style={{ transformOrigin: `${x(r.perDecade)}px ${y}px`, transform: shown ? "scaleX(1)" : "scaleX(0)", transition: `transform 500ms ease-out ${i * 50}ms` }}
              />
              <circle cx={x(r.perDecade)} cy={y} r={r.searched ? 6 : 5} fill={color} stroke="#161A21" strokeWidth={2} style={{ opacity: shown ? 1 : 0, transition: `opacity 300ms ease-out ${i * 50 + 200}ms` }} />
              <text x={W - 8} y={y + 4} textAnchor="end" fontSize={12} fill={r.inconclusive ? "#8D97A6" : "#B3BBC7"} className="tnum">
                {signed(r.perDecade, digits)}
                {r.inconclusive ? " · inconclusive" : ""}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-[10px] border border-highlight-border bg-highlight px-3 py-2 text-[12px] text-text shadow-float tnum"
          style={{ left: `${(x(sorted[hover].perDecade) / W) * 100}%`, top: `${((18 + hover * ROW - 8) / H) * 100}%` }}
        >
          <b>{sorted[hover].name}</b> {signed(sorted[hover].perDecade, digits)} ± {fixed(sorted[hover].ci95, digits)} {unit} · {pLabel(sorted[hover].p)}
        </div>
      )}
    </div>
    </div>
  );
}

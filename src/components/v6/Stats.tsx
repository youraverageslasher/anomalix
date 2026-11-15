import type { ReactNode } from "react";
import { CountUp, Reveal } from "./motion";

export interface StatCell {
  label: string;
  value: ReactNode;
  note?: string;
}

export function StatRow({ cells, className = "" }: { cells: StatCell[]; className?: string }) {
  return (
    <Reveal className={`grid grid-cols-2 overflow-hidden rounded-card border border-rule bg-card lg:grid-cols-4 ${className}`}>
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`flex flex-col gap-2 p-5 md:p-6 ${i % 2 === 0 ? "border-r border-rule" : ""} ${i < 2 ? "border-b border-rule lg:border-b-0" : ""} ${i === 1 ? "lg:border-r" : ""} ${i === 2 ? "lg:border-r" : ""}`}
        >
          <span className="label">{c.label}</span>
          <span className="whitespace-nowrap font-serif text-[24px] leading-none text-text tnum sm:text-[30px]">{c.value}</span>
          {c.note && <span className="text-[12.5px] text-muted">{c.note}</span>}
        </div>
      ))}
    </Reveal>
  );
}

export interface BigStat {
  value: number;
  format: (v: number) => string;
  label: string;
  line: string;
}

export function BigStats({ stats, className = "" }: { stats: BigStat[]; className?: string }) {
  return (
    <Reveal className={`grid grid-cols-2 rounded-card border border-rule bg-card py-8 shadow-card lg:grid-cols-4 lg:py-12 ${className}`}>
      {stats.map((s, i) => (
        <div key={s.label} className={`flex flex-col items-center px-4 py-5 text-center lg:py-0 ${i > 0 ? "lg:border-l lg:border-rule" : ""}`}>
          <CountUp value={s.value} format={s.format} className="whitespace-nowrap font-serif text-[48px] leading-none text-text sm:text-[56px] md:text-stat" />
          <span aria-hidden className="mt-5 block h-[2px] w-[34px] bg-signal" />
          <span className="label mt-4 text-text">{s.label}</span>
          <span className="mt-2 text-[14px] text-muted">{s.line}</span>
        </div>
      ))}
    </Reveal>
  );
}

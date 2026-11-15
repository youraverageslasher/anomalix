import type { ReactNode } from "react";
import { Reveal } from "@/components/v6/motion";

export interface SpecRow {
  term: string;
  value: ReactNode;
}

export function SourceSheet({
  letter,
  kicker,
  name,
  kind,
  summary,
  visual,
  rows,
  href,
  hrefLabel,
  delay = 0,
}: {
  letter: string;
  kicker: string;
  name: string;
  kind: string;
  summary: string;
  visual: ReactNode;
  rows: SpecRow[];
  href: string;
  hrefLabel: string;
  delay?: number;
}) {
  return (
    <Reveal as="section" className="card-hover group relative flex flex-col overflow-hidden rounded-card border border-rule bg-card shadow-card">
      <div style={{ transitionDelay: `${delay}ms` }} className="relative flex flex-1 flex-col p-7 md:p-10">
        <span
          aria-hidden
          className="source-letter pointer-events-none absolute -right-2 -top-10 hidden select-none font-serif md:block text-[220px] font-medium leading-none md:text-[260px]"
        >
          {letter}
        </span>
        <p className="label relative">{kicker}</p>
        <h2 className="relative mt-5 font-serif md:max-w-[calc(100%-160px)] text-[44px] font-medium leading-[1.02] tracking-[-0.025em] text-text md:text-[56px]">{name}</h2>
        <p className="relative mt-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">{kind}</p>
        <p className="relative mt-5 max-w-[520px] text-[16.5px] leading-[1.6] text-body">{summary}</p>
        <div className="relative mt-8">{visual}</div>
        <dl className="relative mt-8 border-t border-rule">
          {rows.map((r) => (
            <div key={r.term} className="grid grid-cols-1 gap-1 border-b border-rule py-[14px] sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
              <dt className="text-[13.5px] text-muted">{r.term}</dt>
              <dd className="text-[14.5px] leading-relaxed text-text">{r.value}</dd>
            </div>
          ))}
        </dl>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="relative mt-8 inline-flex w-fit items-center gap-2 text-[14.5px] font-medium text-text underline decoration-highlight-border underline-offset-[6px] transition-colors hover:decoration-text"
        >
          {hrefLabel}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            ↗
          </span>
        </a>
      </div>
    </Reveal>
  );
}

export function VarChip({ code, label, used }: { code: string; label: string; used?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12.5px] ${
        used ? "border-text bg-text text-bg" : "border-rule text-body"
      }`}
    >
      <span className="font-semibold tracking-[0.04em]">{code}</span>
      <span className={used ? "text-bg/70" : "text-muted"}>{label}</span>
    </span>
  );
}

import type { ReactNode } from "react";
import { Reveal } from "./motion";

export function Figure({
  n,
  title,
  caption,
  source,
  children,
  className = "",
}: {
  n: number;
  title: string;
  caption?: ReactNode;
  source: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Reveal as="figure" className={`card-hover rounded-card border border-rule bg-card p-6 shadow-card md:p-7 ${className}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[12.5px] font-bold text-text">Figure {n}</span>
        <h3 className="font-serif text-figure text-text">{title}</h3>
      </div>
      <div className="mt-5">{children}</div>
      <figcaption className="mt-5">
        {caption && <p className="text-[14px] leading-relaxed text-body">{caption}</p>}
        <p className="mt-2 text-[12px] text-muted">Data source: {source}</p>
      </figcaption>
    </Reveal>
  );
}

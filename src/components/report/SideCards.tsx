import { fixed, pLabel, signed } from "@/lib/data/fmt";
import type { Confidence } from "@/lib/data/verdict";

export function ConfidenceCard({ confidence, p, agree = true, className = "" }: { confidence: Confidence; p: number; agree?: boolean; className?: string }) {
  const strength = Math.max(0, Math.min(1, -Math.log10(Math.max(p, 1e-12)) / 4));
  const filled = Math.round(strength * 28);
  return (
    <div className={`card-hover w-[230px] rounded-card-sm border border-highlight-border bg-highlight p-4 shadow-float ${className}`}>
      <p className="label text-text">Confidence</p>
      <div className="mt-3 flex h-[20px] items-stretch gap-[3px]" role="img" aria-label={`Evidence strength ${filled} of 28 ticks`}>
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} className={`w-[3px] rounded-[1px] ${i < filled ? "bg-text" : "bg-dot-dark"}`} />
        ))}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[14px] font-semibold text-text">{confidence === "Inconclusive" ? "Inconclusive" : `${confidence} confidence`}</span>
        <span className="text-[12.5px] text-body tnum">{pLabel(p)}</span>
      </div>
      <p className={`mt-1 text-[12px] ${agree ? "text-muted" : "text-text"}`}>{agree ? "Regression and Mann-Kendall agree" : "Methods disagree: treat as Inconclusive"}</p>
      <p className="mt-2 text-[12px] leading-snug text-muted">Ticks fill as the regression p shrinks, from p = 1 to p ≤ 0.0001.</p>
    </div>
  );
}

export function PlanetCard({ globalPerDecade, ci, years, line, className = "" }: { globalPerDecade: number; ci: number; years: string; line: string; className?: string }) {
  return (
    <div className={`card-hover w-[220px] rounded-card-sm border border-highlight-border bg-highlight p-4 shadow-float ${className}`}>
      <p className="label text-text">Planet check</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="font-serif text-[30px] font-semibold leading-none text-text tnum">{signed(globalPerDecade)}</span>
        <span className="text-[12px] text-body">°C/decade</span>
      </p>
      <p className="mt-2 text-[12.5px] text-body tnum">
        GISTEMP ± {fixed(ci)}, same years {years}
      </p>
      <p className="mt-1 text-[12.5px] font-semibold text-text">{line}</p>
    </div>
  );
}

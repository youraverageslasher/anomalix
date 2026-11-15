import type { Verdict } from "@/lib/data/verdict";
import { pLabel } from "@/lib/data/fmt";

const SEALS: { id: Verdict["confidence"]; title: string; rule: string }[] = [
  { id: "High", title: "High confidence", rule: "Regression p < 0.01, a margin of error narrower than half the trend, and Mann-Kendall agrees." },
  { id: "Medium", title: "Medium confidence", rule: "Regression p < 0.05 and Mann-Kendall agrees. The signal is there, with wider doubt around its size." },
  { id: "Inconclusive", title: "Inconclusive", rule: "Regression p ≥ 0.05, the interval crosses zero, the two methods disagree, or a stricter check fails: Theil-Sen or the p adjusted for autocorrelation." },
];

export function VerdictVisual({ v, p, name }: { v: Verdict; p: number; name: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {SEALS.map((s, i) => {
        const earned = s.id === v.confidence;
        return (
          <article
            key={s.id}
            className={`seal card-hover relative flex min-h-[260px] flex-col rounded-card p-6 ${earned ? "border border-text bg-highlight shadow-float" : s.id === "Inconclusive" ? "border border-dashed border-highlight-border bg-card" : "border border-rule bg-card"}`}
            style={{ transitionDelay: `${i * 90}ms` }}
            aria-current={earned ? "true" : undefined}
          >
            <span aria-hidden className={`grid h-[44px] w-[44px] place-items-center rounded-full border ${earned ? "border-text" : "border-highlight-border"}`}>
              <span className={`h-[10px] w-[10px] rounded-full ${earned ? (v.confidence === "Inconclusive" ? "bg-muted" : v.direction === "up" ? "bg-signal" : "bg-ramp-12") : "bg-dot-dark"}`} />
            </span>
            <h3 className="mt-5 font-serif text-[24px] leading-tight text-text">{s.title}</h3>
            <p className="mt-3 text-[14px] leading-relaxed text-body">{s.rule}</p>
            {earned && (
              <p className="mt-auto pt-5 text-[13px] font-semibold text-text">
                Earned by {name.split(",")[0]} · {pLabel(p)}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

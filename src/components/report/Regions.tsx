import grid from "../../../public/data/brazil-grid.json";
import { colorFor } from "@/lib/data/color";
import { intLabel, signed } from "@/lib/data/fmt";
import { Reveal } from "@/components/v6/motion";

export function Regions({ variable = "T2M" }: { variable?: string }) {
  const regions = [...grid.regions].sort((a, b) => b.mean - a.mean);
  return (
    <section aria-labelledby="regions" className="mx-auto mt-20 max-w-canvas px-5 md:px-side">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="regions" className="font-serif text-[36px] font-medium tracking-[-0.02em] text-text md:text-[44px]">
          Brazil by region
        </h2>
        <p className="text-[14px] text-muted">
          <span className="font-bold text-text">Figure 10</span> Temperature trend, mean of the grid points in each region, fixed period {grid.period}
          {variable !== "T2M" && <span className="block">Brazil maps show air temperature only, whatever variable you pick above.</span>}
        </p>
      </div>
      <Reveal className="mt-8 grid grid-cols-1 overflow-hidden rounded-card border border-rule bg-card shadow-card sm:grid-cols-2 lg:grid-cols-5">
        {regions.map((r, i) => (
          <article key={r.id} className={`region-col p-6 ${i > 0 ? "border-t border-rule lg:border-l lg:border-t-0" : ""}`} aria-label={`${r.name}: ${signed(r.mean)} °C per decade, from ${signed(r.min)} to ${signed(r.max)}, ${r.count} grid points`}>
            <p className="flex items-center gap-2 text-[14px] font-medium text-text">
              <span aria-hidden className="h-[10px] w-[10px] rounded-[2px]" style={{ background: colorFor(r.mean) }} />
              {r.name}
            </p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-serif text-[40px] leading-none text-text tnum">{signed(r.mean)}</span>
              <span className="text-[12px] text-muted">°C/decade</span>
            </p>
            <div className="mt-4 h-[4px] w-full overflow-hidden rounded-full bg-track">
              <div className="grow-bar h-full rounded-full" style={{ width: `${Math.min(100, (r.mean / 0.75) * 100)}%`, background: colorFor(r.mean) }} />
            </div>
            <p className="mt-4 text-[13px] text-body tnum">
              From {signed(r.min)} to {signed(r.max)}
            </p>
            <p className="mt-1 text-[12.5px] text-muted">{intLabel(r.count)} grid points sampled</p>
          </article>
        ))}
      </Reveal>
    </section>
  );
}

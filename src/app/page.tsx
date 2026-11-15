import grid from "../../public/data/brazil-grid.json";
import { HeroSearch } from "@/components/home/HeroSearch";
import { HeroMap } from "@/components/home/HeroMap";
import { StripesFigure } from "@/components/home/StripesFigure";
import { BrazilChoropleth } from "@/components/v6/BrazilChoropleth";
import { Legend } from "@/components/v6/Legend";
import { Reveal } from "@/components/v6/motion";
import { Pill } from "@/components/ui/Pill";
import { ButtonLink } from "@/components/ui/Button";
import { EXAMPLE_CITIES } from "@/lib/data/cities";
import { intLabel, signed } from "@/lib/data/fmt";
import { HomeStats } from "@/components/home/HomeStats";
import { HomeSpan } from "@/components/home/useCompare";

export default function Home() {
  const states = grid.states;
  const stateValues = Object.fromEntries(states.map((s) => [s.sigla, s.value]));
  const sorted = [...states].sort((a, b) => b.value - a.value);
  const fastest = sorted.slice(0, 3);
  const slowest = sorted[sorted.length - 1];
  const spread = Math.round(fastest[0].value / slowest.value);
  const gridCount = grid.national.count;

  return (
    <main>
      <HeroSearch stateValues={stateValues} />

      <HeroMap stateValues={stateValues} />

      <div className="mx-auto mt-6 flex max-w-canvas flex-col gap-6 px-5 md:flex-row md:items-start md:justify-between md:px-side-map">
        <p className="max-w-[560px] text-[13px] leading-relaxed text-muted">
          <span className="font-semibold text-body">Figure 1.</span> Temperature trend for {EXAMPLE_CITIES.length} example cities, <HomeSpan />, as the
          OLS trend per decade, each with its own significance test. Brazil is shaded by state because it is the deep dive below. Source: NASA POWER (MERRA-2).
        </p>
        <Legend nationalMean={grid.national.mean} />
      </div>

      <section aria-label="The numbers behind Anomalix" className="mx-auto mt-16 max-w-canvas px-5 md:px-side">
        <HomeStats gridCount={gridCount} />
      </section>

      <section aria-labelledby="deep-dive" className="mx-auto mt-16 grid max-w-canvas grid-cols-1 items-center gap-12 px-5 md:px-side-map lg:grid-cols-[minmax(0,520px)_1fr]">
        <Reveal>
          <Pill variant="light">DEEP DIVE · BRAZIL</Pill>
          <h2 id="deep-dive" className="mt-6 font-serif text-[40px] font-medium leading-[1.06] tracking-[-0.02em] text-text md:text-[56px]">
            One country, down to the state
          </h2>
          <p className="mt-6 text-bodyl text-body">
            To stress-test the method, we mapped all of Brazil: {states.length} states, {intLabel(gridCount)} NASA grid points. The pace runs
            from {signed(slowest.value)} °C per decade in {slowest.name} to {signed(fastest[0].value)} in {fastest[0].name}. Every state shows a
            positive trend, the fastest about {spread} times the slowest.
          </p>
          <dl className="mt-8 flex gap-10">
            {[
              [String(states.length), "States"],
              [intLabel(gridCount), "Grid points"],
              [`${spread}x`, "Spread"],
            ].map(([v, l]) => (
              <div key={l}>
                <dd className="font-serif text-[40px] leading-none text-text tnum">{v}</dd>
                <dt className="label mt-2">{l}</dt>
              </div>
            ))}
          </dl>
          <ButtonLink href="/states" className="mt-9">
            Explore all {states.length} states <span aria-hidden>→</span>
          </ButtonLink>
        </Reveal>

        <Reveal className="relative">
          <div className="mx-auto max-w-[560px]">
            <BrazilChoropleth width={560} stateValues={stateValues} />
          </div>
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <Legend nationalMean={grid.national.mean} />
            <div className="card-hover w-full rounded-card-sm border border-highlight-border bg-highlight p-4 shadow-float sm:w-[240px]">
              <p className="label">Fastest states</p>
              <ol className="mt-3 flex flex-col">
                {fastest.map((s) => (
                  <li key={s.sigla} className="rank-row flex items-center justify-between rounded-[8px] px-2 py-[7px]">
                    <span className="text-[14px] text-text">{s.name}</span>
                    <span className="font-serif text-[16px] font-semibold text-text tnum">{signed(s.value)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Reveal>
      </section>

      <section aria-label="Warming stripes" className="mx-auto mt-16 max-w-canvas px-5 md:px-side">
        <StripesFigure />
      </section>
    </main>
  );
}

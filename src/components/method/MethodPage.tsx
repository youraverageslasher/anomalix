"use client";

import { partialNote, periodText, spanOf } from "@/lib/data/range";
import { alignTwoSources } from "@/lib/data/twoSource";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchedPlace } from "@/lib/useSearchedPlace";
import grid from "../../../public/data/brazil-grid.json";
import { DotGlobe } from "@/components/v6/DotGlobe";
import type { MapMarker } from "@/components/v6/DotMap";
import { CountUp, Reveal } from "@/components/v6/motion";
import { Pill } from "@/components/ui/Pill";
import { useLoad, type MainData } from "@/components/report/useReportData";
import { reportHref } from "@/lib/geo";
import { fixed, pLabel, signed, intLabel } from "@/lib/data/fmt";
import { Rail, STEPS } from "./Rail";
import { StepShell } from "./StepShell";
import { InputVisual } from "./InputVisual";
import { CellVisual } from "./CellVisual";
import { DecompVisual } from "./DecompVisual";
import { StatsVisual } from "./StatsVisual";
import { VerdictVisual } from "./VerdictVisual";
import { MIN_SERIES_YEARS, WINDOW_YEARS } from "@/lib/data/windows";

const STATE_VALUES = Object.fromEntries(grid.states.map((s) => [s.sigla, s.value]));
const DEFAULT = { name: "São José do Rio Preto, SP", lat: -20.81, lon: -49.38 };

function Loading({ h = 320 }: { h?: number }) {
  return <div aria-hidden className="w-full animate-pulse rounded-card bg-card" style={{ height: h }} />;
}

export function MethodPage() {
  const search = useSearchedPlace();
  const place = search.place ?? DEFAULT;
  const main = useLoad<MainData>(`/api/report?lat=${place.lat.toFixed(4)}&lon=${place.lon.toFixed(4)}&name=${encodeURIComponent(place.name)}&season=ALL&extras=0`);
  /* The full GISTEMP record; the comparison below keeps only the years it shares with the place. */
  const planet = useLoad<MainData>(`/api/global?season=ALL`);
  const steps = useRef<HTMLDivElement>(null);
  const [globe, setGlobe] = useState(0);
  useEffect(() => {
    const set = () => setGlobe(window.innerWidth >= 1024 ? 520 : window.innerWidth >= 640 ? 380 : 0);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  const d = main.status === "ready" ? main.data : null;
  const g = planet.status === "ready" ? planet.data : null;
  const span = d ? spanOf(d.analysis) : null;
  const FROM = span?.from ?? NaN;
  const TO = span?.to ?? NaN;
  const partial = d ? partialNote(d.coverage, span) : "";
  const two = d && g ? alignTwoSources(d.analysis.annual, g.analysis.annual) : null;
  const report = reportHref({ nome: place.name, lat: place.lat, lon: place.lon, cc: search.place?.cc ?? undefined, admin1: search.place?.admin1 ?? undefined });
  const globeFocus = useMemo<[number, number]>(() => (search.place ? [search.place.lon, Math.max(-50, Math.min(50, search.place.lat))] : [-55, -15]), [search.place]);
  const globeMarkers = useMemo<MapMarker[]>(() => (search.place ? [{ id: "place", lat: search.place.lat, lon: search.place.lon, tone: "searched", label: search.place.name.split(",")[0] }] : []), [search.place]);

  return (
    <main>
      <section aria-labelledby="method-title" className="mx-auto grid max-w-canvas grid-cols-1 items-center gap-10 px-5 pb-10 pt-14 md:px-side lg:grid-cols-[minmax(0,1fr)_520px] lg:pt-20">
        <div>
          <Pill>METHOD · FIVE STEPS, ONE VERDICT</Pill>
          <h1 id="method-title" className="mt-8 font-serif text-[56px] font-medium leading-[0.98] tracking-[-0.035em] text-text md:text-[92px] xl:text-[104px]">
            How a number becomes a verdict
          </h1>
          <blockquote className="mt-6 max-w-[620px] border-l-2 border-highlight-border pl-4 font-serif text-[20px] italic leading-snug text-body md:text-[22px]">
            Where on Earth is global warming already breaking through natural weather noise, and how is the local Earth system responding?
          </blockquote>
          <p className="mt-8 max-w-[620px] text-[19px] leading-[1.6] text-body">
            Every number here ships with a margin of error, a statistical test and a named NASA source. When the data cannot support a conclusion, the
            verdict says so in plain words.
          </p>
          <nav aria-label="Jump to a step" className="mt-10 flex flex-wrap gap-2">
            {STEPS.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className="try-chip inline-flex h-[36px] items-center gap-2 rounded-full border border-rule bg-card px-4 text-[13.5px] text-body hover:border-highlight-border hover:text-text">
                <span className="mr-2 text-[12px] text-muted tnum">0{i + 1}</span>
                {s.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="hidden justify-center sm:flex" aria-hidden>
          {globe > 0 && <DotGlobe size={globe} focus={globeFocus} markers={globeMarkers} highlight={search.highlight} neutralBrazil={search.foreign} rotate={!search.place} stateValues={STATE_VALUES} degreesPerSecond={2} ariaLabel="" />}
        </div>
      </section>

      <div className="mx-auto mt-6 max-w-canvas px-5 md:px-side">
        <p className="rounded-full border border-rule bg-card px-5 py-3 text-center text-[14px] text-body">
          Worked example: <span className="text-text">{search.loc?.kind === "brazil" && search.line ? search.line : place.name}</span>{span ? `, ${FROM}-${TO}` : ""}. Every figure below is computed live with the same pipeline as{" "}
          <Link href={report} className="text-text underline decoration-highlight-border underline-offset-4 hover:decoration-text">
            its report
          </Link>
          .
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-canvas grid-cols-1 gap-12 px-5 md:px-side lg:grid-cols-[200px_minmax(0,1fr)]">
        <Rail container={steps} />
        <div ref={steps}>
          <StepShell
            n={1}
            id="input"
            kicker="Input"
            title="You choose the place"
            visual={<InputVisual name={place.name} lat={place.lat} lon={place.lon} stateValues={STATE_VALUES} highlight={search.highlight} neutralBrazil={search.foreign} />}
          >
            <p>Type any city on Earth, or pick Global, then choose the years you care about.</p>
            <p>Open-Meteo turns the name into latitude and longitude. We then look up the NASA POWER grid cell that covers that point.</p>
          </StepShell>

          <StepShell
            n={2}
            id="data"
            kicker="Data · NASA POWER"
            title="We fetch the record from NASA"
            flip
            visual={d?.cell ? <CellVisual lat={place.lat} lon={place.lon} cell={d.cell} perDecade={d.analysis.trend.perDecade} months={d.months?.length ?? d.analysis.monthsUsed} from={FROM} to={TO} /> : <Loading h={420} />}
          >
            <p>
              A monthly series of air temperature from NASA POWER, MERRA-2 based
              {span ? <>: {intLabel(d?.months?.length ?? 0)} monthly values for this place, {periodText(span, "power")}</> : null}.
              {partial ? <> {partial}</> : null}
            </p>
            <p>
              Reports can switch to four variables: air temperature at 2 m (°C), precipitation (mm/day), relative humidity at 2 m (%) and wind speed at 2 m (m/s).
              The example here stays on temperature. We drop the annual summary key, the -999 fill value and any year with a missing month.
            </p>
            <p>NASA POWER serves the MERRA-2 grid: 0.5° of latitude by 0.625° of longitude, about 55 by 69 km at the equator, narrower east to west toward the poles. The result describes that cell, a region, not a single thermometer.</p>
          </StepShell>

          <StepShell
            n={3}
            id="decomposition"
            kicker="Decomposition"
            title="We separate signal from noise"
            visual={d?.months ? <DecompVisual a={d.analysis} months={d.months} from={FROM} to={TO} /> : <Loading h={520} />}
          >
            <p>The series splits into three layers: the long-term trend, the seasonal cycle and the residual.</p>
            <p>The cycle comes out first, so an ordinary summer can never pass for warming. Scroll and the layers pull apart.</p>
          </StepShell>

          <StepShell
            n={4}
            id="statistics"
            kicker="Statistics"
            title="We test against chance"
            flip
            visual={d ? <StatsVisual a={d.analysis} from={FROM} to={TO} /> : <Loading h={460} />}
          >
            <p>We fit a straight line through the yearly means (OLS) and measure its 95% margin of error.</p>
            <p>Then a second check on the same series: Mann-Kendall (Z, p and Sen&apos;s slope) asks only whether later years tend to sit above earlier ones.</p>
            <p>It is a good second opinion because it assumes no bell curve and is robust to outliers, so a few extreme years cannot fake a trend.</p>
            <p>
              The OLS slope in °C per decade does not depend on the baseline, so a local rate from the POWER years can be compared with the GISTEMP rate on the same years, even
              though GISTEMP anomalies use 1951 to 1980.
            </p>
            <p>
              Yearly climate series are often autocorrelated, so a p value from a simple line fit can look more certain than it is. Treat borderline results with care. This app
              measures the lag 1 autocorrelation of the residuals{d ? <> ({fixed(d.analysis.trend.lag1)} here)</> : null}, shrinks the number of years to an effective size when it is
              positive and recomputes p with it. An adjusted p of 0.05 or more keeps the verdict Inconclusive. It is a simple AR(1) approximation, not a full time series model.
            </p>
            <p>
              Window stability repeats the whole test on every run of {WINDOW_YEARS} complete years in sequence, moving one year at a time (a year with a missing month is skipped, not filled), so a series of N complete years gives N
              minus {WINDOW_YEARS - 1} windows{d ? <> ({d.analysis.annual.length} years here, {d.analysis.annual[0].year}-{d.analysis.annual[d.analysis.annual.length - 1].year}, so {Math.max(0, d.analysis.annual.length - WINDOW_YEARS + 1)} windows)</> : null}. It is shown only for series of at least {MIN_SERIES_YEARS} complete years.
            </p>
          </StepShell>

          <StepShell
            n={5}
            id="verdict"
            kicker="Verdict"
            title="The verdict carries a seal"
            visual={d ? <VerdictVisual v={d.verdict} p={d.analysis.trend.p} name={place.name} /> : <Loading h={260} />}
          >
            <p>One fixed rule, checked in this order, decides the seal:</p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>Significant: the regression gives p &lt; 0.05 and its 95% interval excludes zero, and Mann-Kendall gives p &lt; 0.05. If only one of the two passes, the methods disagree and the seal is Inconclusive.</li>
              <li>Conservative checks: the p adjusted for lag 1 autocorrelation is below 0.05, and the Theil-Sen median slope has the same sign as the regression slope and falls inside its 95% interval. If either fails, the seal is Inconclusive and the report says which check failed.</li>
              <li>High: steps 1 and 2 pass, the regression p is below 0.01, and the 95% half width is less than half the size of the slope.</li>
              <li>Medium: steps 1 and 2 pass, but not the High test.</li>
              <li>Inconclusive: everything else.</li>
            </ol>
            <p>There is no Low tier: a trend that fails any step is Inconclusive, not low confidence. Inconclusive is a result too, reported plainly. Not significant does not mean no trend, and a longer series can change it.</p>
          </StepShell>
        </div>
      </div>

      <section aria-labelledby="rules" className="mx-auto mt-10 max-w-canvas px-5 md:px-side">
        <h2 id="rules" className="sr-only">Three rules</h2>
        <div className="grid grid-cols-1 overflow-hidden rounded-card border border-rule bg-card shadow-card md:grid-cols-3">
          <Reveal className="p-8">
            <p className="label">Rule 1</p>
            <h3 className="mt-3 font-serif text-[26px] leading-tight text-text">Every number has a margin</h3>
            <p className="mt-4 font-serif text-[44px] leading-none text-text">{d ? <CountUp value={d.analysis.trend.perDecade} format={(v) => signed(v)} /> : "…"}</p>
            <p className="mt-3 text-[14px] text-body tnum">{d ? `± ${fixed(d.analysis.trend.ci95PerDecade)} °C per decade · regression ${pLabel(d.analysis.trend.p)}. Never a bare number.` : "Loading the live value."}</p>
          </Reveal>
          <Reveal className="border-t border-rule p-8 md:border-l md:border-t-0">
            <p className="label">Rule 2</p>
            <h3 className="mt-3 font-serif text-[26px] leading-tight text-text">Local and global, side by side</h3>
            <p className="mt-4 font-serif text-[44px] leading-none text-text">{two ? <CountUp value={two.global.trend.perDecade} format={(v) => signed(v)} /> : "…"}</p>
            <p className="mt-3 text-[14px] text-body">
              NASA GISTEMP for the planet, on the same years as the place{two ? ` (${two.years[0]}-${two.years[two.years.length - 1]}, °C per decade)` : ""}. A comparison, not a proof.
            </p>
          </Reveal>
          <Reveal className="border-t border-rule p-8 md:border-l md:border-t-0">
            <p className="label">Rule 3</p>
            <h3 className="mt-3 font-serif text-[26px] leading-tight text-text">We report trends, not causes</h3>
            <p className="mt-4 text-[14px] leading-relaxed text-body">The verdict describes what was measured over time. It never assigns a cause, local or global. That question needs other evidence.</p>
          </Reveal>
        </div>
        {(main.status === "error" || planet.status === "error") && (
          <p role="alert" className="mt-4 text-center text-[14px] text-body">
            {main.status === "error" ? `NASA POWER: ${main.error}. ` : ""}
            {planet.status === "error" ? `GISTEMP: ${planet.error}. ` : ""}
            The live figures above are missing instead of guessed.
          </p>
        )}
      </section>
    </main>
  );
}

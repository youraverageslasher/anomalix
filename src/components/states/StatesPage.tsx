"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchedPlace, type SearchState } from "@/lib/useSearchedPlace";
import { Pill } from "@/components/ui/Pill";
import { DotMap } from "@/components/v6/DotMap";
import { Legend } from "@/components/v6/Legend";
import { CountUp, Reveal } from "@/components/v6/motion";
import { REGIONS, type RegionId } from "@/lib/data/brazil";
import { fixed, intLabel, signed } from "@/lib/data/fmt";
import { reportHref } from "@/lib/geo";
import { INSIGHT, NATIONAL, PERIOD, POINT_COUNT, REGION_ROWS, STATES, STATE_VALUES } from "./data";
import { StatesMap } from "./StatesMap";
import { RegionCards } from "./RegionCards";
import { Ranking } from "./Ranking";
import { DecadesFilm } from "./DecadesFilm";

const REGION_MEANS = Object.fromEntries(REGION_ROWS.map((r) => [r.id, r.mean])) as Record<RegionId, number>;

function Stat({ value, format, label }: { value: number; format: (v: number) => string; label: string }) {
  return (
    <div className="border-t border-rule pt-4">
      <p className="font-serif text-[44px] leading-none tracking-[-0.02em] text-text tnum">
        <CountUp value={value} format={format} />
      </p>
      <p className="mt-2 text-[13px] text-muted">{label}</p>
    </div>
  );
}

export function StatesPage() {
  const search = useSearchedPlace();
  const p = search.place;
  /* A new search remounts the page state, so no open card or hover from the previous place survives. */
  return <StatesBody key={p ? `${p.lat},${p.lon},${p.cc ?? ""}` : "none"} search={search} />;
}

function StatesBody({ search }: { search: SearchState }) {
  const place = search.place;
  const placeState = search.highlight?.sigla ?? null;
  const placeRegion = search.highlight?.region ?? null;
  const placeRow = placeState ? STATES.find((s) => s.sigla === placeState) ?? null : null;

  const [active, setActive] = useState<string | null>(null);
  const [hoverRegion, setHoverRegion] = useState<RegionId | null>(null);
  const [open, setOpen] = useState<RegionId | null>(placeRegion);

  const I = INSIGHT;
  const inlandFaster = I.inland.mean > I.coastal.mean;
  const short = place?.name.split(",")[0];

  return (
    <main>
      <section aria-labelledby="states-title" className="mx-auto grid max-w-canvas grid-cols-1 gap-12 px-5 pt-14 md:px-side lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-10 lg:pt-20">
        <div className="flex flex-col lg:col-start-1 lg:row-start-1">
          <div>
            <Pill variant="light">BRAZIL GRID · DEEP DIVE · {STATES.length} STATES</Pill>
          </div>
          <h1 id="states-title" className="mt-8 font-serif text-[54px] font-medium leading-[0.98] tracking-[-0.035em] text-text md:text-[84px] xl:text-[96px]">
            Brazil does not warm evenly
          </h1>
          <p className="mt-8 max-w-[560px] text-[18.5px] leading-[1.6] text-body">
            From {I.slowest.name} ({signed(I.slowest.value)}) to {I.fastest.name} ({signed(I.fastest.value)} °C per decade), the pace differs{" "}
            {fixed(I.ratio, 1)} times over. The {I.topRegion.name} warms fastest of the five regions and the {I.bottomRegion.name} slowest, and{" "}
            {inlandFaster ? "states without a coastline outpace the coastal ones" : "coastal states outpace the ones without a coastline"} (
            {signed(inlandFaster ? I.inland.mean : I.coastal.mean)} against {signed(inlandFaster ? I.coastal.mean : I.inland.mean)}).
          </p>
          {place && (
            <p className="mt-6 max-w-[560px] rounded-card-sm border border-rule bg-card px-4 py-3 text-[14.5px] text-body">
              {placeRow && placeRegion ? (
                <>
                  <span className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-signal align-middle" aria-hidden />
                  <span className="text-text">{search.line}</span>. {placeRow.name} ranks {placeRow.rank} of {STATES.length} at {signed(placeRow.value)} °C per decade, and the {REGIONS[placeRegion].name} averages {signed(REGION_MEANS[placeRegion])}.{" "}
                  <Link href={reportHref({ nome: place.name, lat: place.lat, lon: place.lon, cc: place.cc ?? undefined, admin1: place.admin1 ?? undefined })} className="text-text underline decoration-highlight-border underline-offset-4 hover:decoration-text">
                    Open its report
                  </Link>
                </>
              ) : (
                search.foreign ? (
                <>{short} is outside Brazil, so nothing on this map is highlighted. This page covers the {STATES.length} Brazilian states only.</>
              ) : (
                <>{short} could not be placed in a state with confidence, so nothing on this map is highlighted.</>
              )
              )}
            </p>
          )}
          <div className="mt-10 grid grid-cols-3 gap-5">
            <Stat value={STATES.length} format={(v) => intLabel(v)} label="states ranked" />
            <Stat value={POINT_COUNT} format={(v) => intLabel(v)} label="grid points, 1° apart" />
            <Stat value={I.ratio} format={(v) => `${fixed(v, 1)}×`} label="fastest to slowest" />
          </div>

        </div>

        <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <figure className="rounded-card border border-rule bg-card p-4 shadow-card md:p-7">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-2 px-1">
              <span className="font-serif text-[24px] text-text md:text-[28px]">Brazil by region</span>
              <span className="text-[13px] text-muted">
                <span className="font-semibold text-text">Figure 12</span> · °C per decade, {PERIOD}
              </span>
            </figcaption>
            <div className="mt-4">
              <StatesMap values={STATE_VALUES} regionMeans={REGION_MEANS} active={active} onActive={setActive} activeRegion={hoverRegion} place={place} highlight={search.highlight} />
            </div>
            <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-muted">
              Fill is the state mean. Light lines mark the five regions, each labeled with the mean of its grid points. Hover a state or a row below.
            </p>
          </figure>
        </div>

        <div className="flex flex-col lg:col-start-1 lg:row-start-2">
          <Reveal className="rounded-card border border-rule bg-card p-5 shadow-card">
            <p className="label">Where Brazil sits</p>
            <div className="mt-3">
              <DotMap width={560} height={270} stateValues={STATE_VALUES} ariaLabel="World map in dots with Brazil shaded by state" />
            </div>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-[300px_minmax(0,1fr)]">
            <Legend nationalMean={NATIONAL} />
            <p className="text-[12.5px] leading-relaxed text-muted">
              Each state value is the mean OLS trend of the 1° grid points inside it plus its capital, {PERIOD}, NASA POWER T2M. Computed from{" "}
              {intLabel(POINT_COUNT)} grid points{I.allPositive ? `, every one with a positive slope (lowest ${signed(I.minPoint)})` : ""}.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="decades" className="mx-auto mt-24 max-w-canvas px-5 md:px-side">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 id="decades" className="font-serif text-[38px] font-medium leading-tight tracking-[-0.025em] text-text md:text-[48px]">
            Decade by decade
          </h2>
          <p className="max-w-[440px] text-[13.5px] text-muted">The trend above is a slope. Here is what it adds up to: every grid cell, one decade at a time.</p>
        </div>
        <DecadesFilm figure={13} />
      </section>

      <section aria-labelledby="regions" className="mx-auto mt-24 max-w-canvas px-5 md:px-side">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="regions" className="font-serif text-[38px] font-medium leading-tight tracking-[-0.025em] text-text md:text-[48px]">
            Five regions, five speeds
          </h2>
          <p className="text-[13.5px] text-muted">Mean, range and count of the grid points in each region. Open a card for its states.</p>
        </div>
        <div className="mt-8">
          <RegionCards regions={REGION_ROWS} open={open} onOpen={setOpen} onHover={setHoverRegion} active={active} onActive={setActive} placeState={placeState} />
        </div>
      </section>

      <section aria-labelledby="ranking" className="mx-auto mt-24 max-w-canvas px-5 md:px-side">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <h2 id="ranking" className="font-serif text-[38px] font-medium leading-tight tracking-[-0.025em] text-text md:text-[48px]">
            Ranking by state
          </h2>
          <p className="text-[13.5px] text-muted">
            <span className="font-semibold text-text">Figure 14</span> · °C per decade, fastest first
          </p>
        </div>
        <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_260px]">
          <Ranking states={STATES} active={active} onActive={setActive} placeState={placeState} />
          <aside aria-label="Locator map" className="hidden xl:block">
            <div className="sticky top-6 rounded-card border border-rule bg-card p-4">
              <StatesMap compact values={STATE_VALUES} regionMeans={REGION_MEANS} active={active} onActive={setActive} activeRegion={null} place={place} highlight={search.highlight} />
              <p className="mt-2 text-center text-[12px] text-muted">Hover a row or a state</p>
            </div>
          </aside>
        </div>
        <p className="mt-6 text-[13px] text-muted">
          Temperature only: this page ranks air temperature at 2 meters (T2M). Rain, humidity and wind are not part of it.
        </p>
      </section>
    </main>
  );
}

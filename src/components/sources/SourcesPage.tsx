"use client";

import { useEffect, useState } from "react";
import { useSearchedPlace } from "@/lib/useSearchedPlace";
import grid from "../../../public/data/brazil-grid.json";
import pkg from "../../../package.json";
import { CountUp, Reveal } from "@/components/v6/motion";
import { Stripes } from "@/components/v6/Stripes";
import { useLoad, type MainData } from "@/components/report/useReportData";
import { intLabel, signed } from "@/lib/data/fmt";
import { CELL_LAT, CELL_LON } from "@/lib/data/power";
import { partialNote, periodText, spanOf, type Span } from "@/lib/data/range";
import { alignTwoSources } from "@/lib/data/twoSource";
import { COASTLINES, TRUE_COLOR } from "@/lib/data/worldview";
import { BASELINE_LABEL } from "@/lib/data/analyze";
import { SourceSheet, VarChip } from "./SourceSheet";
import { DEFAULT_VARIABLE, VARIABLES, VARIABLE_CODES } from "@/lib/data/variables";
import { CoverageMap } from "./CoverageMap";
import { TwoSourcesFigure } from "@/components/report/TwoSources";
import { utcDate } from "@/lib/data/origin";

const STATE_VALUES = Object.fromEntries(grid.states.map((s) => [s.sigla, s.value]));
const DEFAULT = { name: "São José do Rio Preto, SP", lat: -20.81, lon: -49.38 };
const KM_PER_DEG = 111.32;

const limits = (s: Span | null) => [
  { title: "It is not a station.", body: "The cell covers a region about 55 by 69 km, not the thermometer downtown." },
  { title: "It is not a forecast.", body: `It describes what already happened${s ? `, ${s.from} to ${s.to}` : ""}. It says nothing about next year.` },
  { title: "It does not assign a cause.", body: "It measures how much and how surely a variable moved. Why it moved is a different question." },
  { title: "It can be inconclusive.", body: "When the test cannot separate signal from chance, the verdict says so. Not significant does not mean no trend." },
];

function version(name: keyof typeof pkg.dependencies | keyof typeof pkg.devDependencies) {
  const all = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;
  return all[name]?.replace(/^[\^~]/, "") ?? "";
}

/* The access date is the day this page fetched the live data, so it is read from the clock, never typed. */
const references = (accessed: string): { group: string; items: string[] }[] => [
  {
    group: "Data endpoints",
    items: [
      `NASA Langley Research Center, POWER Project. POWER monthly point API, parameters T2M, PRECTOTCORR, RH2M and WS2M, community RE. https://power.larc.nasa.gov/api/temporal/monthly/point (accessed ${accessed})`,
      `GISTEMP Team, GISS Surface Temperature Analysis (GISTEMP v4), NASA Goddard Institute for Space Studies. Global monthly and annual means. https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv (accessed ${accessed})`,
      `GISTEMP Team, GISTEMP v4 zonal annual means, used for the latitude band comparison. https://data.giss.nasa.gov/gistemp/tabledata_v4/ZonAnn.Ts+dSST.csv (accessed ${accessed})`,
      `Open-Meteo geocoding API, location data based on GeoNames. https://geocoding-api.open-meteo.com/v1/search (accessed ${accessed})`,
      "NASA GMAO, MERRA-2 reanalysis, the meteorological basis of POWER. https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/",
      `NASA Earth Science Data Systems, NASA Worldview with GIBS imagery: ${TRUE_COLOR} and ${COASTLINES}. Linked from each report for visual inspection; no imagery or data is fetched by the app. https://worldview.earthdata.nasa.gov/ (accessed ${accessed})`,
    ],
  },
  {
    group: "Methods",
    items: [
      "Mann, H. B. (1945). Nonparametric tests against trend. Econometrica, 13(3), 245-259.",
      "Kendall, M. G. (1975). Rank Correlation Methods, 4th ed. Charles Griffin, London.",
      "Sen, P. K. (1968). Estimates of the regression coefficient based on Kendall's tau. Journal of the American Statistical Association, 63(324), 1379-1389.",
    ],
  },
  {
    group: "Maps",
    items: [
      `world-atlas ${version("world-atlas")}, land at 1:110m, derived from Natural Earth. https://github.com/topojson/world-atlas`,
      "Brazil state boundaries, brazil-states.geojson from click_that_hood (Code for America). https://github.com/codeforamerica/click_that_hood",
      "Region grouping follows the five IBGE macro-regions. https://www.ibge.gov.br/",
    ],
  },
  {
    group: "Software",
    items: [
      `Next.js ${version("next")} and React ${version("react")}. https://nextjs.org/`,
      `Apache ECharts ${version("echarts")} with echarts-for-react ${version("echarts-for-react")}. https://echarts.apache.org/`,
      `d3-geo ${version("d3-geo")} and topojson-client ${version("topojson-client")}. https://d3js.org/d3-geo`,
      `Tailwind CSS ${version("tailwindcss")}, TypeScript ${version("typescript")}, Vitest ${version("vitest")}.`,
      `Build and test tooling: topojson-server ${version("topojson-server")} and topojson-simplify ${version("topojson-simplify")} (Brazil topology), tsx ${version("tsx")}, PostCSS ${version("postcss")}, Autoprefixer ${version("autoprefixer")}, ESLint ${version("eslint")} with eslint-config-next.`,
      "Source Serif 4 and Inter, SIL Open Font License, served with next/font. https://fonts.google.com/",
    ],
  },
  {
    group: "Disclosure",
    items: [
      "AI use: code and copy were drafted with Claude, an AI assistant by Anthropic, and reviewed by the team. No number on this site comes from the AI: every figure is computed live from the sources above.",
    ],
  },
];

function CopyReferences({ refs }: { refs: { group: string; items: string[] }[] }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");
  const text = refs.map((g) => `${g.group}\n${g.items.map((i) => `- ${i}`).join("\n")}`).join("\n\n");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("fail");
    }
    setTimeout(() => setState("idle"), 2200);
  }
  return (
    <button
      onClick={copy}
      className="inline-flex h-[36px] items-center gap-2 rounded-full border border-highlight-border px-4 text-[13px] font-medium text-text transition-colors hover:bg-highlight"
    >
      <span aria-live="polite">{state === "done" ? "Copied" : state === "fail" ? "Copy failed, select the text" : "Copy all references"}</span>
    </button>
  );
}

function Ledger({ value, label, sub }: { value: number | null; label: string; sub: string }) {
  return (
    <div className="border-t border-rule pt-5">
      <p className="font-serif text-[56px] leading-none tracking-[-0.03em] text-text tnum md:text-[64px]">
        {value === null ? <span className="text-muted">…</span> : <CountUp value={value} format={(v) => intLabel(v)} />}
      </p>
      <p className="mt-3 text-[15px] text-text">{label}</p>
      <p className="mt-1 text-[13px] text-muted">{sub}</p>
    </div>
  );
}

export function SourcesPage() {
  const search = useSearchedPlace();
  const place = search.place ?? DEFAULT;

  /* Both requests ask for the whole record; every year shown below is read from what comes back. */
  const main = useLoad<MainData>(`/api/report?lat=${place.lat.toFixed(4)}&lon=${place.lon.toFixed(4)}&name=${encodeURIComponent(place.name)}&season=ALL&extras=0`);
  const planet = useLoad<MainData>(`/api/global?season=ALL`);
  const d = main.status === "ready" ? main.data : null;
  const g = planet.status === "ready" ? planet.data : null;
  const r = g;
  const sa = d ? spanOf(d.analysis) : null;
  const sb = r ? spanOf(r.analysis) : null;
  const two = d && g ? alignTwoSources(d.analysis.annual, g.analysis.annual) : null;
  const [accessed, setAccessed] = useState("today");
  useEffect(() => setAccessed(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })), []);
  const refs = references(accessed);
  const short = place.name.split(",")[0];
  const kmLat = Math.round(CELL_LAT * KM_PER_DEG);
  const kmLon = Math.round(CELL_LON * KM_PER_DEG * Math.cos((place.lat * Math.PI) / 180));
  const errors = [main, planet].filter((x) => x.status === "error") as { status: "error"; error: string }[];

  return (
    <main>
      <section aria-labelledby="sources-title" className="mx-auto max-w-canvas px-5 pb-6 pt-14 md:px-side lg:pt-20">
        <p className="label">Sources</p>
        <h1 id="sources-title" className="mt-6 max-w-[1100px] font-serif text-[54px] font-medium leading-[0.98] tracking-[-0.035em] text-text md:text-[92px] xl:text-[108px]">
          Where every number comes from
        </h1>
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-16">
          <p className="max-w-[520px] text-[19px] leading-[1.6] text-body">
            Public NASA data, open and keyless. The app queries it live and computes every result on the spot.
          </p>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            <Ledger value={d?.months?.length ?? null} label="monthly values" sub={`behind ${short}, NASA POWER`} />
            <Ledger value={r?.months?.length ?? null} label="months of global record" sub={r ? `GISTEMP, ${sb?.from} to ${sb?.to}${r.origin?.kind === "snapshot" ? `, bundled snapshot fetched ${utcDate(r.origin.fetchedAt)}` : ""}` : "GISTEMP"} />
            <Ledger value={grid.points.length} label="grid points" sub={`across Brazil, ${grid.period}`} />
          </div>
        </div>
      </section>

      <div className="mx-auto mt-14 grid max-w-canvas grid-cols-1 gap-6 px-5 md:px-side lg:grid-cols-2 lg:gap-8">
        <SourceSheet
          letter="A"
          kicker="Source A · The place"
          name="NASA POWER"
          kind="Reanalysis based on MERRA-2"
          summary="A gridded record of the atmosphere, rebuilt from satellites and observations. It gives every place on Earth a continuous monthly series."
          visual={
            d ? (
              <div>
                <Stripes anomalies={d.analysis.anomalies} height={56} rounded={10} label={`Warming stripes for ${short}${sa ? `, ${sa.from} to ${sa.to}` : ""}, one per year against ${BASELINE_LABEL}`} />
                <p className="mt-2 flex justify-between text-[12px] text-muted tnum">
                  <span>{sa?.from}</span>
                  <span className="hidden sm:inline">{short} · one stripe per year</span>
                  <span>{sa?.to}</span>
                </p>
              </div>
            ) : (
              <div className="h-[78px] animate-pulse rounded-[10px] bg-field" />
            )
          }
          rows={[
            {
              term: "Variables",
              value: (
                <span className="flex flex-wrap gap-2">
                  {VARIABLE_CODES.map((c) => (
                    <VarChip key={c} code={c} label={`${VARIABLES[c].short.toLowerCase()}, ${VARIABLES[c].unit}`} used={c === DEFAULT_VARIABLE} />
                  ))}
                </span>
              ),
            },
            { term: "Product", value: "NASA POWER, MERRA-2 based, monthly" },
            { term: "Period", value: sa ? `Monthly, ${periodText(sa, "power")} at ${short}, complete years only.${partialNote(d?.coverage, sa) ? ` ${partialNote(d?.coverage, sa)}` : ""}` : "Read from the live response" },
            { term: "Resolution", value: `Cell of ${CELL_LAT}° × ${CELL_LON}°, about ${kmLat} × ${kmLon} km at ${short}` },
            { term: "Used for", value: "All four feed the city trend and both statistical tests; T2M, the highlighted default, is the only one on the Brazil map, the Brazil Grid page and Global." },
            { term: "Cleaning", value: "The annual key (YYYY13) and the -999 fill value are dropped. Only complete years enter the analysis." },
            { term: "Access", value: "Open API, no key" },
          ]}
          href="https://power.larc.nasa.gov/"
          hrefLabel="power.larc.nasa.gov"
        />
        <SourceSheet
          letter="B"
          kicker="Source B · The planet"
          name="NASA GISS GISTEMP v4"
          kind="Station based analysis"
          summary="The global surface temperature record from NASA GISS, merging land stations (NOAA GHCN v4) with sea surface data (ERSST v5) into one series."
          delay={120}
          visual={
            r ? (
              <div>
                <Stripes anomalies={r.analysis.anomalies} height={56} rounded={10} label={`Warming stripes for the planet${sb ? `, ${sb.from} to ${sb.to}` : ""}, one per year against ${BASELINE_LABEL}`} />
                <p className="mt-2 flex justify-between text-[12px] text-muted tnum">
                  <span>{sb?.from}</span>
                  <span className="hidden sm:inline">Planet · one stripe per year</span>
                  <span>{sb?.to}</span>
                </p>
              </div>
            ) : (
              <div className="h-[78px] animate-pulse rounded-[10px] bg-field" />
            )
          }
          rows={[
            { term: "Variable", value: "Global anomaly, land and ocean" },
            { term: "Period", value: sb ? `Monthly, ${periodText(sb, "gistemp")}, complete years only.${partialNote(r?.coverage, sb) ? ` ${partialNote(r?.coverage, sb)}` : ""} Kept separate from the POWER years.` : "Read from the live response" },
            { term: "Baseline", value: `Published against 1951 to 1980. The app shows anomalies against ${BASELINE_LABEL}; slopes do not depend on the baseline.` },
            { term: "Used for", value: two ? `The Global region, and the comparison on the years shared with ${short}: ${signed(two.global.trend.perDecade)} °C per decade, ${two.years[0]} to ${two.years[two.years.length - 1]}` : "The Global region and the comparison" },
            { term: "Access", value: "Open CSV tables" },
          ]}
          href="https://data.giss.nasa.gov/gistemp/"
          hrefLabel="data.giss.nasa.gov/gistemp"
        />
      </div>

      <section aria-label="Coverage" className="mx-auto mt-8 max-w-canvas px-5 md:px-side">
        <Reveal>
          <CoverageMap
            stateValues={STATE_VALUES}
            pointCount={grid.points.length}
            nationalMean={grid.national.mean}
            period={grid.period}
            globalTrend={two ? two.global.trend.perDecade : null}
            search={search}
          />
        </Reveal>
      </section>

      <section aria-label="Comparison" className="mx-auto mt-8 max-w-canvas px-5 md:px-side">
        <TwoSourcesFigure
          n={2}
          name={place.name}
          global={false}
          season="ALL"
          local={d ? d.analysis.annual : null}
          planet={g ? g.analysis.annual : null}
          origin={g?.origin}
          error={planet.status === "error" ? planet.error : main.status === "error" ? main.error : undefined}
        />
      </section>

      <section aria-labelledby="limits" className="mx-auto mt-24 max-w-canvas px-5 md:px-side">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] lg:gap-16">
          <div>
            <p className="label">Limits</p>
            <h2 id="limits" className="mt-4 font-serif text-[40px] font-medium leading-[1.04] tracking-[-0.025em] text-text md:text-[52px]">
              What this number is not
            </h2>
          </div>
          <ol className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-rule bg-rule sm:grid-cols-2">
            {limits(sa).map((l, i) => (
              <Reveal as="li" key={l.title} className="limit-cell bg-card p-7 md:p-8">
                <span className="font-serif text-[52px] leading-none text-muted tnum">0{i + 1}</span>
                <p className="mt-6 font-serif text-[23px] leading-snug text-text">{l.title}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-body">{l.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="credits" className="mx-auto mt-24 max-w-canvas px-5 md:px-side">
        <p className="label" id="credits">
          Credits
        </p>
        <div className="mt-6 grid grid-cols-1 gap-8 border-t border-rule pt-8 md:grid-cols-3">
          <Reveal>
            <p className="font-serif text-[22px] text-text">City and map data</p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-body">NASA Langley Research Center POWER Project, with meteorology from the NASA GMAO MERRA-2 reanalysis.</p>
          </Reveal>
          <Reveal>
            <p className="font-serif text-[22px] text-text">Global data</p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-body">GISTEMP Team, NASA Goddard Institute for Space Studies, GISTEMP v4.</p>
          </Reveal>
          <Reveal>
            <p className="font-serif text-[22px] text-text">Figures</p>
            <p className="mt-3 text-[14.5px] leading-relaxed text-body">Warming stripes inspired by Ed Hawkins, University of Reading.</p>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="refs" className="mx-auto mt-20 max-w-canvas px-5 md:px-side">
        <div className="rounded-card border border-rule p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="refs" className="label">
              References
            </h2>
            <CopyReferences refs={refs} />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
            {refs.map((grp) => (
              <div key={grp.group}>
                <p className="text-[12.5px] font-semibold text-body">{grp.group}</p>
                <ul className="mt-2 space-y-2">
                  {grp.items.map((it) => (
                    <li key={it} className="break-words text-[12.5px] leading-relaxed text-muted">
                      {it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        {errors.length > 0 && (
          <p role="alert" className="mt-4 text-center text-[14px] text-body">
            {errors.map((e) => e.error).join(". ")}. The live figures that depend on it are left empty instead of guessed.
          </p>
        )}
      </section>
    </main>
  );
}

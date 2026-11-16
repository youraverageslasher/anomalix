"use client";

import { DotGlobe } from "@/components/v6/DotGlobe";
import { HighlightCard, type CityCardData } from "@/components/v6/CityCard";
import { CountUp } from "@/components/v6/motion";
import { coordText, fixed, pLabel, signed } from "@/lib/data/fmt";
import type { MainData } from "./useReportData";
import type { SearchState } from "@/lib/useSearchedPlace";
import { ConfidenceCard, PlanetCard } from "./SideCards";
import { aboutRatio, agreement, alignTwoSources } from "@/lib/data/twoSource";
import { partialNote, periodText, spanOf } from "@/lib/data/range";
import { BASELINE_LABEL } from "@/lib/data/analyze";
import grid from "../../../public/data/brazil-grid.json";
import { VARIABLES, directionWord, type VariableCode } from "@/lib/data/variables";

const STATE_VALUES = Object.fromEntries(grid.states.map((s) => [s.sigla, s.value]));
import type { MapArc, MapMarker } from "@/components/v6/DotMap";
import { gistempName } from "@/lib/data/origin";


function Tag({ children, dot, dashed }: { children: React.ReactNode; dot?: string; dashed?: boolean }) {
  return (
    <span className={`inline-flex h-[30px] items-center gap-2 rounded-full border bg-card px-3 text-[12.5px] font-semibold text-body ${dashed ? "border-dashed border-highlight-border" : "border-rule"}`}>
      {dot && <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  );
}

/* One plain note on whether the two methods agree; shown beside the headline verdict. */
export function agreementNote(d: MainData): string {
  const v = d.verdict;
  const mk = d.analysis.mk;
  if (v.methodsAgree) {
    return v.regressionSignificant
      ? `Mann-Kendall agrees: Z = ${fixed(mk.z)}, ${pLabel(mk.p)}.`
      : `Mann-Kendall agrees that chance cannot be ruled out: ${pLabel(mk.p)}.`;
  }
  return v.regressionSignificant
    ? `Methods disagree: the regression gives ${pLabel(d.analysis.trend.p)} but Mann-Kendall gives ${pLabel(mk.p)}. Treat as Inconclusive.`
    : `Methods disagree: Mann-Kendall gives ${pLabel(mk.p)} but the regression gives ${pLabel(d.analysis.trend.p)}. Treat as Inconclusive.`;
}

export function verdictSentence(d: MainData, from: number, to: number, variable: VariableCode = "T2M"): { lead: string; body: string } {
  const V = VARIABLES[variable];
  const t = d.analysis.trend;
  const rate = `${signed(t.perDecade, V.digits)} ± ${fixed(t.ci95PerDecade, V.digits)} ${V.unit} per decade since ${from}`;
  const total = `${signed(d.analysis.totalChange, V.digits >= 3 ? 2 : 1)} ${V.unit}`;
  if (d.verdict.confidence === "Inconclusive") {
    return {
      lead: "Inconclusive.",
      body: `The estimate is ${rate}, with ${pLabel(t.p)} in the regression${d.verdict.crossesZero ? " and a 95% interval that crosses zero" : ""}. ${agreementNote(d)} Not significant does not mean no trend. A longer series can change the verdict.`,
    };
  }
  return {
    lead: `${directionWord(variable, d.verdict.direction)}.`,
    body: `${rate}, ${pLabel(t.p)} in the regression${d.verdict.confidence === "Medium" ? ", medium confidence" : ""}. ${agreementNote(d)} Across ${from}-${to}, the trend adds up to ${total}.`,
  };
}

export function Hero({
  search,
  name,
  lat,
  lon,
  global,
  from,
  to,
  d,
  planet,
  variable = "T2M",
  shadeBrazil = false,
}: {
  variable?: VariableCode;
  /* Brazil's state shading on the globe, only for a place located in Brazil. */
  shadeBrazil?: boolean;
  search: SearchState;
  name: string;
  lat: number;
  lon: number;
  global: boolean;
  from: number;
  to: number;
  d: MainData;
  planet: MainData | null;
}) {
  const t = d.analysis.trend;
  const v = d.verdict;
  const V = VARIABLES[variable];
  const sentence = verdictSentence(d, from, to, variable);
  const inconclusive = v.confidence === "Inconclusive";
  const dirDot = inconclusive || !V.temperature ? "#8D97A6" : v.direction === "up" ? "#EF5A4C" : "#5C97EA";
  const seal = v.confidence === "Inconclusive" ? "Inconclusive" : `${v.confidence} confidence`;
  const card: CityCardData = {
    name: global ? "Global mean" : name,
    country: global ? "GISTEMP v4" : "",
    perDecade: t.perDecade,
    ci95: t.ci95PerDecade,
    p: t.p,
    inconclusive: v.confidence === "Inconclusive",
    direction: v.direction,
    anomalies: d.analysis.anomalies,
    variable,
  };
  const markers: MapMarker[] = global
    ? []
    : [
        { id: "city", lat, lon, tone: "searched", label: name.split(",")[0] },
      ];
  /* Only the searched place is marked: no other cities, no decorative arcs. */
  const arcs: MapArc[] = [];
  const focus: [number, number] = global ? [-30, 10] : [lon, Math.max(-50, Math.min(50, lat))];
  /* The planet rate is recomputed on the years both series share, so the two rates compare like with like. */
  const two = planet && !global ? alignTwoSources(d.analysis.annual, planet.analysis.annual) : null;
  const ag = two ? agreement(two.local, two.global) : null;
  const span = spanOf(d.analysis);
  const partial = partialNote(d.coverage, span);

  return (
    <section aria-labelledby="place-title" className="mx-auto grid max-w-canvas grid-cols-1 items-center gap-10 px-5 pt-10 md:px-side lg:grid-cols-[600px_1fr]">
      <div>
        <div className="flex flex-wrap gap-2">
          <Tag dot={dirDot}>{inconclusive ? "No clear direction" : directionWord(variable, v.direction)}</Tag>
          <Tag>{pLabel(t.p)}</Tag>
          <Tag dashed={inconclusive}>{seal}</Tag>
          <Tag dashed={!v.methodsAgree}>{v.methodsAgree ? "Methods agree" : "Methods disagree"}</Tag>
        </div>
        <h1 id="place-title" className="mt-6 font-serif text-[44px] font-medium leading-[1.04] tracking-[-0.02em] text-text md:text-[66px]">
          {global ? "The whole planet" : name}
        </h1>
        <p className="mt-3 text-[14px] text-muted tnum">
          {global ? "Global mean of land and ocean · NASA GISS GISTEMP v4" : `${search.loc?.kind === "brazil" && search.line ? `${search.line} · ` : ""}${coordText(lat, lon)} · grid cell ≈ 55 × 69 km`}
        </p>
        <p className={`mt-6 font-serif text-[96px] font-medium leading-[0.9] tracking-[-0.04em] md:text-[176px] ${inconclusive ? "text-body" : "text-text"}`}>
          <CountUp value={t.perDecade} format={(x) => signed(x, V.digits)} />
        </p>
        <p className="mt-2 font-serif text-[24px] italic text-body">
          {V.unit} per decade{V.temperature ? "" : ` · ${V.name.toLowerCase()}`}
        </p>
        <p className="mt-6 text-bodyl text-body">
          <strong className="font-semibold text-text">{sentence.lead}</strong> {sentence.body}
        </p>
        {v.downgradedBecause ? (
          <p className="mt-3 rounded-card-sm border border-dashed border-highlight-border px-4 py-3 text-[13.5px] leading-relaxed text-body">
            The regression alone would call this significant, but {v.downgradedBecause}, so the verdict stays Inconclusive.
          </p>
        ) : t.lag1 > 0.3 ? (
          <p className="mt-3 rounded-card-sm border border-dashed border-highlight-border px-4 py-3 text-[13.5px] leading-relaxed text-body">
            The yearly residuals are autocorrelated (lag 1 r = <span className="tnum">{fixed(t.lag1)}</span>). The p value adjusted for that is{" "}
            <span className="tnum">{pLabel(t.pAdj).replace("p ", "")}</span>, and the verdict already accounts for it.
          </p>
        ) : null}
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
          {global
            ? `GISTEMP v4 merges thousands of land stations and ocean measurements into one global mean${span ? `: ${periodText(span, "gistemp")}` : ""}. Anomalies are shown against ${BASELINE_LABEL}.${d.origin?.kind === "snapshot" ? ` Source: ${gistempName(d.origin)}.` : ""}`
            : `${V.name} (${V.code}, ${V.unit}) from NASA POWER, MERRA-2 based, monthly${span ? `: ${periodText(span, "power")}` : ""}. The grid cell spans about 55 by 69 km: the number describes the surrounding region, not a station in the city center.`}
          {partial ? ` ${partial}` : ""}
        </p>
      </div>

      <div className="relative mx-auto w-full max-w-[660px]">
        <div className="flex justify-center">
          <DotGlobe size={660} focus={focus} stateValues={STATE_VALUES} highlight={search.highlight} neutralBrazil={!shadeBrazil || !V.temperature} markers={markers} arcs={arcs} rotate={global} degreesPerSecond={2} ariaLabel={global ? "Globe drawn in dots" : `Globe centered on ${name}`} />
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-4 lg:mt-0 lg:block">
          <div className="lg:absolute lg:bottom-[70px] lg:left-[-30px]">
            <HighlightCard data={card} />
          </div>
          <div className="lg:absolute lg:bottom-[20px] lg:right-[-10px]">
            <ConfidenceCard confidence={v.confidence} p={t.p} agree={v.methodsAgree} />
          </div>
          {two && ag && V.temperature && (
            <div className="lg:absolute lg:right-[-20px] lg:top-[60px]">
              <PlanetCard
                globalPerDecade={two.global.trend.perDecade}
                ci={two.global.trend.ci95PerDecade}
                years={`${two.years[0]}-${two.years[two.years.length - 1]}`}
                line={
                  two.local.verdict.confidence === "Inconclusive"
                    ? "Not enough evidence to compare"
                    : ag.kind === "same" && ag.ratio !== null
                      ? `Here ${aboutRatio(ag.ratio)} times the planet's rate`
                      : "The directions do not agree"
                }
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

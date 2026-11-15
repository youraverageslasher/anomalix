"use client";

import { dash, partialNote, periodText, spanOf } from "@/lib/data/range";
import { BASELINE_LABEL } from "@/lib/data/analyze";
import { DaysNights, RigorRow, SignalNoise } from "./Rigor";
import { ClimateAnalog, HighsShift, Seasons } from "./Panels";
import { PatternScaling, WindowStability, WorldviewLink, ZonalComparison } from "./Stability";
import { POWER_START } from "@/lib/data/power";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { useReportParams } from "./params";
import { resolveSearch } from "@/lib/useSearchedPlace";
import { useReportData } from "./useReportData";
import { SubBar } from "./SubBar";
import { Controls } from "./Controls";
import { Hero } from "./Hero";
import { ForestPlot, type ForestRow } from "./ForestPlot";
import { BrazilFigure } from "./BrazilFigure";
import { placeScope } from "@/lib/data/placeScope";
import { Anatomy } from "./Anatomy";
import { Regions } from "./Regions";
import { Reproduce } from "./Reproduce";
import { Stripes } from "@/components/v6/Stripes";
import { StatRow } from "@/components/v6/Stats";
import { Figure } from "@/components/v6/Figure";
import { CountUp } from "@/components/v6/motion";
import { fixed, pShort, signed, reportCode, todayLabel } from "@/lib/data/fmt";
import { VARIABLES } from "@/lib/data/variables";
import { Chart, AXIS_TEXT, GRID_LINE, TOOLTIP } from "./Chart";

function Skeleton() {
  return (
    <div aria-hidden className="mx-auto grid max-w-canvas grid-cols-1 gap-10 px-5 pt-10 md:px-side lg:grid-cols-[600px_1fr]">
      <div className="animate-pulse">
        <div className="flex gap-2">
          {[90, 80, 120].map((w) => (
            <div key={w} className="h-[30px] rounded-full bg-track" style={{ width: w }} />
          ))}
        </div>
        <div className="mt-6 h-[60px] w-4/5 rounded-[10px] bg-track" />
        <div className="mt-4 h-4 w-60 rounded bg-track" />
        <div className="mt-8 h-[150px] w-[360px] rounded-[14px] bg-track" />
        <div className="mt-6 h-20 w-full rounded-[10px] bg-track" />
      </div>
      <div className="mx-auto aspect-square w-full max-w-[560px] animate-pulse rounded-full bg-card" />
    </div>
  );
}

function Unit({ children }: { children: React.ReactNode }) {
  return <span className="ml-1 font-sans text-[13px] text-muted">{children}</span>;
}

export function ReportPage() {
  const [p, update] = useReportParams();
  const search = useMemo(() => resolveSearch(!p.global && p.valid ? { name: p.name || "This place", lat: p.lat, lon: p.lon, cc: p.cc, admin1: p.admin1 } : null), [p.global, p.valid, p.name, p.lat, p.lon, p.cc, p.admin1]);
  const { main, planet, compare } = useReportData(p);
  const code = useMemo(() => reportCode(`${p.global ? "G" : `${p.lat.toFixed(2)},${p.lon.toFixed(2)}`}|${p.from}|${p.to}|${p.season}|${p.variable}`), [p]);
  const V = VARIABLES[p.variable];
  const du = `${V.unit}/decade`;
  const sp = useSearchParams();
  const share = !p.global && p.valid ? `/card?${sp.toString()}` : null;

  if (!p.valid) {
    return (
      <main className="mx-auto flex max-w-canvas flex-1 flex-col justify-center gap-5 px-5 py-20 md:px-side">
        <p className="label">No place chosen</p>
        <h1 className="font-serif text-[44px] text-text">Pick a city to investigate.</h1>
        <p className="text-bodyl text-body">This address does not say which point on Earth to analyze.</p>
        <Link href="/" className="w-fit text-text underline underline-offset-4">
          Go to the search
        </Link>
      </main>
    );
  }

  const d = main.status === "ready" ? main.data : null;
  /* Only the searched place: Brazil-only sections render only for a place located in Brazil. */
  const scope = placeScope({ global: p.global, loc: search.loc });
  /* Every period on this page is the span of years that really entered the trend, never the request. */
  const S = d ? spanOf(d.analysis) : null;
  const F = S?.from ?? p.from;
  const T = S?.to ?? p.to;
  const kind = p.global ? "gistemp" : "power";
  const seasonNote = p.season === "ALL" ? "" : ` · ${p.season}`;

  const forestRows: ForestRow[] = [];
  if (compare.status === "ready") {
    for (const r of compare.data) {
      if (!r.ok) continue;
      forestRows.push({
        name: r.place.name,
        perDecade: r.perDecade,
        ci95: r.ci95,
        p: r.p,
        inconclusive: r.verdict.confidence === "Inconclusive",
        searched: !p.global && Math.abs(r.place.lat - p.lat) < 0.3 && Math.abs(r.place.lon - p.lon) < 0.35,
      });
    }
    if (d && !p.global && !forestRows.some((r) => r.searched) && p.from >= POWER_START) {
      forestRows.push({
        name: p.name || "This place",
        perDecade: d.analysis.trend.perDecade,
        ci95: d.analysis.trend.ci95PerDecade,
        p: d.analysis.trend.p,
        inconclusive: d.verdict.confidence === "Inconclusive",
        searched: true,
      });
    }
  }
  const inconclusive = forestRows.filter((r) => r.inconclusive);
  const failed = compare.status === "ready" ? compare.data.filter((r) => !r.ok).map((r) => r.place.name) : [];
  const firstOk = compare.status === "ready" ? compare.data.find((r) => r.ok) : undefined;
  const CS = firstOk && firstOk.ok && firstOk.anomalies.length ? { from: firstOk.anomalies[0].year, to: firstOk.anomalies[firstOk.anomalies.length - 1].year } : null;

  return (
    <main className="pb-6">
      <SubBar
        code={code}
        period={S ? periodText(S, kind, p.season === "ALL" ? "years" : `${p.season} seasons`) : null}
        partial={partialNote(d?.coverage, S)}
        today={todayLabel()}
        cardHref={share}
        source={p.global ? "NASA GISS GISTEMP v4 · temperature" : `NASA POWER, MERRA-2 based, monthly · ${V.name} (${V.unit})`}
      />
      <Controls p={p} update={update} />

      {main.status === "loading" && <Skeleton />}
      {main.status === "error" && (
        <section role="alert" className="mx-auto max-w-canvas px-5 py-16 md:px-side">
          <p className="label">The report could not be computed</p>
          <h1 className="mt-4 font-serif text-[40px] text-text">{p.global ? "Global mean" : p.name || "This place"}</h1>
          <p className="mt-4 max-w-[640px] text-bodyl text-body">
            {main.error}. No numbers are shown, because we would rather show nothing than a guess. Try again in a moment, or pick a
            longer period.
          </p>
        </section>
      )}

      {d && (
        <>
          <Hero variable={p.variable} shadeBrazil={scope.shadeBrazilOnGlobe} search={search} name={p.name || "This place"} lat={p.lat} lon={p.lon} global={p.global} from={F} to={T} d={d} planet={planet.status === "ready" ? planet.data : null} />

          <section aria-label="Key numbers" className="mx-auto mt-12 max-w-canvas px-5 md:px-side">
            <StatRow
              cells={[
                { label: "OLS trend", value: <><CountUp value={d.analysis.trend.perDecade} format={(x) => signed(x, V.digits)} /><Unit>{du}</Unit></> },
                { label: "95% CI", value: <><CountUp value={d.analysis.trend.ci95PerDecade} format={(x) => `± ${fixed(x, V.digits)}`} /><Unit>{du}</Unit></> },
                { label: "p-value (regression)", value: pShort(d.analysis.trend.p) },
                { label: `Total ${F}-${T}`, value: <><CountUp value={d.analysis.totalChange} format={(x) => signed(x, V.digits >= 3 ? 2 : 1)} /><Unit>{V.unit}</Unit></> },
              ]}
            />
            <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 rounded-card-sm border border-rule bg-card px-6 py-4 md:grid-cols-[auto_1fr] md:items-center">
              <p className="label">Second check · Mann-Kendall</p>
              <p className="text-[14.5px] text-body tnum">
                <span className="text-text">Z = {fixed(d.analysis.mk.z)}</span> · <span className="text-text">p {pShort(d.analysis.mk.p).startsWith("<") ? pShort(d.analysis.mk.p) : `= ${pShort(d.analysis.mk.p)}`}</span> · S ={" "}
                {d.analysis.mk.s} · Sen&apos;s slope <span className="text-text">{signed(d.analysis.mk.senPerDecade, V.digits)}</span> {du} ·{" "}
                <span className={d.verdict.methodsAgree ? "text-muted" : "font-semibold text-text"}>
                  {d.verdict.methodsAgree ? "agrees with the regression" : "disagrees with the regression: treat as Inconclusive"}
                </span>
              </p>
            </div>
            <RigorRow d={d} variable={p.variable} />
          </section>

          <section aria-label="Signal and noise" className={`mx-auto mt-6 grid max-w-canvas grid-cols-1 items-stretch gap-6 px-5 md:px-side ${d.dayNight ? "lg:grid-cols-2" : ""}`}>
            {d.dayNight && !p.global && <DaysNights data={d.dayNight} />}
            <SignalNoise d={d} variable={p.variable} from={F} to={T} global={p.global} />
          </section>

          {scope.showAnalog && (
            <ClimateAnalog d={d} name={p.name || "This place"} lat={p.lat} lon={p.lon} variable={p.variable} global={p.global} wrapClassName="mx-auto mt-6 max-w-canvas px-5 md:px-side" />
          )}
          <section aria-label="Seasons and daily highs" className={`mx-auto mt-6 grid max-w-canvas grid-cols-1 items-stretch gap-6 px-5 md:px-side ${d.dayNight?.ok && !p.global ? "lg:grid-cols-2" : ""}`}>
            <Seasons d={d} variable={p.variable} global={p.global} />
            <HighsShift d={d} global={p.global} />
          </section>

          <WindowStability d={d} variable={p.variable} global={p.global} />
          <WorldviewLink d={d} lat={p.lat} lon={p.lon} variable={p.variable} global={p.global} />
          <ZonalComparison d={d} lat={p.lat} name={p.name || "This place"} variable={p.variable} global={p.global} sigla={scope.showStateStep ? scope.sigla : null} />
          <PatternScaling d={d} planet={planet.status === "ready" ? planet.data : null} variable={p.variable} global={p.global} name={p.name || "This place"} />

          <section aria-label="Comparisons" className={`mx-auto mt-10 grid max-w-canvas grid-cols-1 items-start gap-6 px-5 md:px-side ${scope.showBrazilFigure ? "lg:grid-cols-2" : ""}`}>
            <Figure
              n={3}
              title="Around the world"
              caption={
                compare.status === "ready" ? (
                  <>
                    Trend with its 95% interval for {forestRows.length} cities, same method everywhere ({CS ? dash(CS) : "same years"}
                    {seasonNote}).{" "}
                    {inconclusive.length > 0 && (
                      <>
                        {inconclusive.map((r) => r.name).join(", ")} {inconclusive.length === 1 ? "is" : "are"} inconclusive: the test cannot rule out chance, so the
                        verdict makes no claim.{" "}
                      </>
                    )}
                    Not significant does not mean no trend.
                    {failed.length > 0 && <> NASA POWER did not answer for {failed.join(", ")}, so they are left out.</>}
                  </>
                ) : undefined
              }
              source={`NASA POWER (MERRA-2), ${V.name.toLowerCase()} (${V.unit}), OLS trend${CS ? ` ${dash(CS)}` : ""} per grid cell.`}
            >
              {compare.status === "ready" && forestRows.length > 0 ? (
                <ForestPlot rows={forestRows} unit={du} digits={V.digits} temperature={V.temperature} />
              ) : compare.status === "error" ? (
                <p role="alert" className="text-[14px] text-body">The comparison cities could not be loaded: {compare.error}.</p>
              ) : (
                <div aria-hidden className="flex animate-pulse flex-col gap-3">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="h-[18px] rounded bg-track" />
                  ))}
                </div>
              )}
            </Figure>
            {scope.showBrazilFigure && <BrazilFigure search={search} variable={p.variable} n={4} name={p.name || "This place"} lat={p.lat} lon={p.lon} from={F} to={T} />}
          </section>

          <section aria-label={V.temperature ? "Warming stripes" : "Yearly anomalies"} className="mx-auto mt-6 max-w-canvas px-5 md:px-side">
            {V.temperature ? (
              <Figure
                n={5}
                title={`${d.analysis.anomalies.length} years in ${d.analysis.anomalies.length} stripes`}
                caption={`Each stripe is one ${p.season === "ALL" ? "year" : `${p.season} season`}, colored by its anomaly against the ${BASELINE_LABEL} mean. Blue ran cooler, red warmer.`}
                source={`${p.global ? "NASA GISS GISTEMP v4" : "NASA POWER (MERRA-2)"}, ${F}-${T}.`}
              >
                <Stripes anomalies={d.analysis.anomalies} height={110} rounded={8} />
                <div className="mt-2 flex justify-between text-[12px] text-muted tnum">
                  <span>{d.analysis.anomalies[0]?.year}</span>
                  <span>{Math.round((d.analysis.anomalies[0]?.year + d.analysis.anomalies[d.analysis.anomalies.length - 1]?.year) / 2)}</span>
                  <span>{d.analysis.anomalies[d.analysis.anomalies.length - 1]?.year}</span>
                </div>
              </Figure>
            ) : (
              <Figure
                n={5}
                title={`${d.analysis.anomalies.length} years against their ${BASELINE_LABEL} mean`}
                caption={`Each bar is one ${p.season === "ALL" ? "year" : `${p.season} season`} of ${V.name.toLowerCase()}, above or below its ${BASELINE_LABEL} mean, in ${V.unit}. One neutral color: the blue to red scale is kept for temperature.`}
                source={`NASA POWER (MERRA-2), ${V.code}, ${F}-${T}.`}
              >
                <Chart
                  height={180}
                  label={`Yearly ${V.name.toLowerCase()} anomalies against ${BASELINE_LABEL}, ${V.unit}`}
                  option={{
                    grid: { left: 64, right: 12, top: 12, bottom: 28 },
                    tooltip: { ...TOOLTIP, trigger: "axis", valueFormatter: (x: number) => `${signed(x, V.digits)} ${V.unit}` },
                    xAxis: { type: "category", data: d.analysis.anomalies.map((a) => a.year), axisLabel: { ...AXIS_TEXT, interval: 9 }, axisTick: { show: false }, axisLine: { lineStyle: { color: "#2B323C" } } },
                    yAxis: { type: "value", axisLabel: { ...AXIS_TEXT, formatter: (x: number) => `${signed(x, V.digits >= 3 ? 2 : 1)} ${V.unit}` }, splitLine: GRID_LINE },
                    series: [{ type: "bar", data: d.analysis.anomalies.map((a) => +a.value.toFixed(4)), itemStyle: { color: "#B3BBC7", borderRadius: 2 }, barCategoryGap: "25%" }],
                  }}
                />
              </Figure>
            )}
          </section>

          <Anatomy
            variable={p.variable}
            d={d}
            planet={planet.status === "ready" ? planet.data : null}
            planetError={planet.status === "error" ? planet.error : undefined}
            global={p.global}
            name={p.name || "This place"}
            from={F}
            to={T}
            season={p.season}
            source={`${p.global ? "NASA GISS GISTEMP v4" : `NASA POWER (MERRA-2), ${V.code}`}, ${F}-${T}${seasonNote}.`}
          />

          <Reproduce variable={p.variable} d={d} name={p.name || "This place"} global={p.global} lat={p.lat} lon={p.lon} from={F} to={T} season={p.season} />

          {scope.showRegions && <Regions variable={p.variable} />}
        </>
      )}
    </main>
  );
}

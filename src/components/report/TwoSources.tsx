"use client";

import { Chart, AXIS_TEXT, GRID_LINE, TOOLTIP } from "./Chart";
import { Figure } from "@/components/v6/Figure";
import { fixed, pShort, signed } from "@/lib/data/fmt";
import { aboutRatio, agreement, alignTwoSources, type SourceFit, type TwoSources as Aligned, type YearValue } from "@/lib/data/twoSource";
import type { Season } from "@/lib/data/types";

const LOCAL = "#EF5A4C";
const GLOBAL = "#ECEEF1";
const POWER_HREF = "https://power.larc.nasa.gov/";
const GISTEMP_HREF = "https://data.giss.nasa.gov/gistemp/";

function verdictText(s: SourceFit): string {
  const v = s.verdict;
  if (v.confidence === "Inconclusive") return v.methodsAgree ? "Inconclusive" : "Inconclusive, methods disagree";
  return `${v.direction === "up" ? "Rising" : "Falling"}, ${v.confidence.toLowerCase()}`;
}

function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return <span aria-hidden className="inline-block w-7 border-t-2" style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }} />;
}

function Column({ tag, title, kind, href, hrefLabel, s, color, dashed }: { tag: string; title: string; kind: string; href: string; hrefLabel: string; s: SourceFit; color: string; dashed?: boolean }) {
  const cells: [string, string, string?][] = [
    ["Trend", signed(s.trend.perDecade), "°C/decade"],
    ["95% CI", `± ${fixed(s.trend.ci95PerDecade)}`],
    ["Regression p", pShort(s.trend.p)],
    ["Verdict", verdictText(s)],
  ];
  return (
    <div className="flex flex-col gap-4 rounded-card-sm border border-rule bg-bg/40 p-5">
      <div>
        <p className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-muted">
          <Swatch color={color} dashed={dashed} />
          {tag}
        </p>
        <p className="mt-2 font-serif text-[22px] leading-tight text-text">{title}</p>
        <p className="mt-1 text-[13px] leading-snug text-body">
          {kind}{" "}
          <a href={href} target="_blank" rel="noreferrer" className="text-text underline decoration-highlight-border underline-offset-4 hover:decoration-text">
            {hrefLabel}
          </a>
        </p>
      </div>
      <dl className="grid grid-cols-2 border-t border-rule">
        {cells.map(([k, v, u], i) => (
          <div key={k} className={`flex flex-col gap-1 py-3 ${i % 2 === 0 ? "border-r border-rule pr-3" : "pl-3"} ${i < 2 ? "border-b border-rule" : ""}`}>
            <dt className="label">{k}</dt>
            <dd className={`font-serif leading-tight text-text tnum ${k === "Verdict" ? "text-[17px]" : "whitespace-nowrap text-[24px]"}`}>
              {v}
              {u && <span className="ml-1.5 font-sans text-[12px] text-muted">{u}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function chartOption(r: Aligned, localName: string | null) {
  const series: Record<string, unknown>[] = [
    {
      name: "Global (GISTEMP)",
      type: "line",
      data: r.global.anomalies.map((p) => [p.year, +p.value.toFixed(3)]),
      symbol: "none",
      lineStyle: { color: GLOBAL, width: 2, type: "dashed" },
      itemStyle: { color: GLOBAL },
      z: 2,
    },
  ];
  const from = r.years[0];
  const to = r.years[r.years.length - 1];
  series.unshift({
    name: "Baseline mean",
    type: "line",
    data: [
      [from, 0],
      [to, 0],
    ],
    symbol: "none",
    silent: true,
    animation: false,
    tooltip: { show: false },
    lineStyle: { color: "#8D97A6", width: 1 },
    z: 1,
  });
  if (localName) {
    series.push({
      name: `${localName} (NASA POWER)`,
      type: "line",
      data: r.local.anomalies.map((p) => [p.year, +p.value.toFixed(3)]),
      symbol: "none",
      lineStyle: { color: LOCAL, width: 2.4 },
      itemStyle: { color: LOCAL },
      z: 3,
    });
  }
  return {
    animationDuration: 1600,
    animationDurationUpdate: 0,
    grid: { left: 56, right: 16, top: 16, bottom: 28 },
    tooltip: {
      ...TOOLTIP,
      trigger: "axis",
      axisPointer: { ...TOOLTIP.axisPointer, type: "line" },
      formatter: (items: { seriesName: string; value: [number, number]; color: string }[]) => {
        const rows = items.filter((i) => i.seriesName !== "Baseline mean");
        if (!rows.length) return "";
        return [`<b>${Math.round(rows[0].value[0])}</b>`, ...rows.map((i) => `${i.seriesName}: ${signed(i.value[1])} °C`)].join("<br/>");
      },
    },
    xAxis: {
      type: "value",
      min: from,
      max: to,
      splitNumber: 5,
      axisLabel: { ...AXIS_TEXT, formatter: (v: number) => String(Math.round(v)) },
      axisLine: { lineStyle: { color: "#2B323C" } },
      axisTick: { show: false },
      splitLine: { show: false },
    },
    yAxis: { type: "value", scale: true, axisLabel: { ...AXIS_TEXT, formatter: (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)} °C` }, splitLine: GRID_LINE, axisLine: { show: false }, axisTick: { show: false } },
    series,
  };
}

export function TwoSourcesFigure({
  n,
  name,
  local,
  planet,
  global,
  season,
  error,
  className = "",
}: {
  n: number;
  name: string;
  local: YearValue[] | null;
  planet: YearValue[] | null;
  global: boolean;
  season: Season;
  error?: string;
  className?: string;
}) {
  const short = name.split(",")[0];
  const unit = season === "ALL" ? "annual" : `${season}`;
  const r = global ? (planet ? alignTwoSources(planet, planet) : null) : local && planet ? alignTwoSources(local, planet) : null;
  const sourceLine = global
    ? `NASA GISS GISTEMP v4, GLB.Ts+dSST.${r ? ` ${r.years[0]}-${r.years[r.years.length - 1]}.` : ""}`
    : `NASA POWER monthly point, T2M, MERRA-2 based, and NASA GISS GISTEMP v4, GLB.Ts+dSST.${r ? ` Common years ${r.years[0]}-${r.years[r.years.length - 1]}.` : ""}`;

  if (!r) {
    return (
      <Figure n={n} title="Two sources" source={sourceLine} className={className}>
        {error ? (
          <p role="alert" className="text-[14px] text-body">The global series could not be loaded ({error}), so the two sources are not compared.</p>
        ) : planet === null || (!global && local === null) ? (
          <div aria-hidden className="h-[300px] animate-pulse rounded-[10px] bg-track" />
        ) : (
          <p role="status" className="text-[14px] text-body">The two series share fewer than ten complete years in this period, so they are not compared.</p>
        )}
      </Figure>
    );
  }

  const g = global ? null : agreement(r.local, r.global);
  const ref = `${r.baseline.from}-${r.baseline.to}`;
  const base = global
    ? `Anomalies against the series' own mean over ${ref}, the years drawn.`
    : `Both series are drawn as anomalies against their own mean over the ${r.baseline.years} years they share, ${ref}, so they sit on one axis. The slopes do not depend on that choice.`;

  return (
    <Figure
      n={n}
      title="Two sources"
      className={className}
      source={sourceLine}
      caption={
        <>
          {r.years.length} {unit} means{global ? "" : " in common"}. {base}{" "}
          {global
            ? "In the Global view both sources coincide in scope, so only the GISTEMP series is drawn."
            : "The global line is the planet as a whole, not a station near this place. This is a comparison with the global trend from a different method, never a validation of the local number."}
        </>
      }
    >
      <p className="label">{global ? "Global station analysis" : "Local reanalysis vs global station analysis"}</p>
      <div className="mt-3 mb-1 flex flex-wrap justify-end gap-x-5 gap-y-1 text-[12px] text-muted">
        {!global && (
          <span className="flex items-center gap-2">
            <Swatch color={LOCAL} />
            {short}, NASA POWER
          </span>
        )}
        <span className="flex items-center gap-2">
          <Swatch color={GLOBAL} dashed />
          Planet, GISTEMP
        </span>
      </div>
      <Chart
        height={300}
        option={chartOption(r, global ? null : short)}
        label={
          global
            ? `Global GISTEMP anomalies, ${r.years[0]} to ${r.years[r.years.length - 1]}`
            : `${short} anomalies from NASA POWER and global anomalies from GISTEMP on one axis, ${r.years[0]} to ${r.years[r.years.length - 1]}`
        }
      />

      <div className={`mt-6 grid grid-cols-1 gap-4 ${global ? "" : "md:grid-cols-2"}`}>
        {!global && (
          <Column
            tag="Local"
            title={`${short} grid cell`}
            kind="MERRA-2 is a reanalysis: a weather model constrained by observations."
            href={POWER_HREF}
            hrefLabel="power.larc.nasa.gov"
            s={r.local}
            color={LOCAL}
          />
        )}
        <Column
          tag="Global context"
          title="The whole planet"
          kind="GISTEMP is station based: land stations and ship and buoy sea temperatures."
          href={GISTEMP_HREF}
          hrefLabel="data.giss.nasa.gov/gistemp"
          s={r.global}
          color={GLOBAL}
          dashed
        />
      </div>

      {g && (
        <p className={`mt-4 rounded-card-sm border px-5 py-4 text-[14.5px] leading-relaxed ${g.kind === "same" ? "border-highlight-border bg-highlight text-text" : "border-dashed border-highlight-border text-body"}`}>
          {g.kind === "same" ? (
            <>
              Both series point the same way: the local trend and the global trend are both {g.direction}.
              {g.ratio !== null && (
                <>
                  {" "}
                  On the same {r.years.length} years the local rate is <span className="font-semibold tnum">{aboutRatio(g.ratio)}</span> times the global rate (
                  <span className="tnum">
                    {signed(r.local.trend.perDecade)} ± {fixed(r.local.trend.ci95PerDecade)} against {signed(r.global.trend.perDecade)} ± {fixed(r.global.trend.ci95PerDecade)} °C per decade
                  </span>
                  ).
                </>
              )}
            </>
          ) : (
            <>
              {r.local.verdict.confidence === "Inconclusive" ? "Not enough evidence to compare: the local trend is Inconclusive. " : ""}
              The two series do not agree on a significant direction. This does not mean there is no trend; a longer series can change it.
            </>
          )}
        </p>
      )}
    </Figure>
  );
}

"use client";

import { BASELINE_LABEL } from "@/lib/data/analyze";
import { Chart, AXIS_TEXT, GRID_LINE, TOOLTIP } from "./Chart";
import { Figure } from "@/components/v6/Figure";
import { fixed, pLabel, signed } from "@/lib/data/fmt";
import type { MainData } from "./useReportData";
import { TwoSourcesFigure } from "./TwoSources";
import type { Season } from "@/lib/data/types";
import { VARIABLES, NEUTRAL_SERIES, type VariableCode } from "@/lib/data/variables";
import { gistempName } from "@/lib/data/origin";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const valueAxis = (unit: string, digits = 0, signedAxis = false) => ({
  type: "value",
  scale: true,
  axisLabel: { ...AXIS_TEXT, formatter: (v: number) => `${v > 0 && signedAxis ? "+" : ""}${v.toFixed(digits)} ${unit}` },
  splitLine: GRID_LINE,
  axisLine: { show: false },
  axisTick: { show: false },
});

const yearAxis = (min: number, max: number, lastLabel = max) => ({
  type: "value",
  min,
  max,
  interval: Math.max(5, Math.round((max - min) / 4 / 5) * 5),
  axisLabel: { ...AXIS_TEXT, formatter: (v: number) => (v > lastLabel ? "" : String(Math.round(v))) },
  axisLine: { lineStyle: { color: "#2B323C" } },
  axisTick: { show: false },
  splitLine: { show: false },
});

const GRID_BASE = { right: 16, top: 18, bottom: 28 };

export function Anatomy({
  variable = "T2M",
  d,
  planet,
  planetError,
  global,
  name,
  from,
  to,
  season,
  source,
}: {
  variable?: VariableCode;
  d: MainData;
  planet: MainData | null;
  planetError?: string;
  global: boolean;
  name: string;
  from: number;
  to: number;
  season: Season;
  source: string;
}) {
  const a = d.analysis;
  const t = a.trend;
  const V = VARIABLES[variable];
  const U = V.unit;
  const C = V.change;
  const ax = V.digits >= 3 ? 1 : 0;
  const lineColor = V.temperature ? "#EF5A4C" : "#ECEEF1";
  const pointColor = V.temperature ? "#ECEEF1" : NEUTRAL_SERIES;
  const GRID = { ...GRID_BASE, left: U.length > 2 ? 78 : 56 };
  const unitWord = season === "ALL" ? "annual" : season;
  const fit = (y: number) => t.intercept + t.slopePerYear * y;

  const series = {
    grid: GRID,
    tooltip: { ...TOOLTIP, trigger: "axis", valueFormatter: (v: number) => `${v.toFixed(V.digits)} ${U}` },
    legend: { show: false },
    xAxis: yearAxis(from, to),
    yAxis: valueAxis(U, ax),
    series: [
      {
        name: season === "ALL" ? "Annual mean" : `${season} mean`,
        type: "line",
        data: a.annual.map((p) => [p.year, +p.value.toFixed(3)]),
        lineStyle: { color: pointColor, width: 1.4 },
        itemStyle: { color: pointColor },
        symbol: "circle",
        symbolSize: 4,
        showSymbol: true,
      },
      {
        name: "OLS trend",
        type: "line",
        data: [
          [from, +fit(from).toFixed(3)],
          [to, +fit(to).toFixed(3)],
        ],
        lineStyle: { color: lineColor, width: 2.4 },
        itemStyle: { color: lineColor },
        symbol: "none",
      },
    ],
  };

  const clim = {
    grid: GRID,
    tooltip: { ...TOOLTIP, trigger: "axis", valueFormatter: (v: number) => `${v.toFixed(V.digits >= 3 ? 2 : 1)} ${U}` },
    xAxis: {
      type: "category",
      data: MONTHS,
      axisLabel: { ...AXIS_TEXT, formatter: (_: string, i: number) => MONTHS[i] },
      axisLine: { lineStyle: { color: "#2B323C" } },
      axisTick: { show: false },
      axisPointer: { label: { formatter: (p: { value: string; seriesData?: unknown }) => String(p.value) } },
    },
    yAxis: valueAxis(U, ax),
    series: [
      {
        name: `${BASELINE_LABEL} mean`,
        type: "line",
        smooth: 0.4,
        data: a.climatology.map((v, i) => ({ value: +v.toFixed(2), name: MONTH_NAMES[i] })),
        lineStyle: { color: "#ECEEF1", width: 2.2 },
        itemStyle: { color: "#161A21", borderColor: "#ECEEF1", borderWidth: 1.6 },
        symbol: "circle",
        symbolSize: 7,
        areaStyle: { color: "rgba(236,238,241,0.04)" },
      },
    ],
  };

  const resid = {
    grid: GRID,
    tooltip: { ...TOOLTIP, trigger: "axis", axisPointer: { ...TOOLTIP.axisPointer, type: "line" }, valueFormatter: (v: number) => `${signed(v, V.digits)} ${C}` },
    xAxis: yearAxis(from, to + 1, to),
    yAxis: valueAxis(V.code === "RH2M" ? "pp" : C, ax, true),
    series: [
      {
        name: "Residual",
        type: "bar",
        barWidth: "70%",
        barCategoryGap: 0,
        data: a.residual.map((r) => ({ value: [+r.t.toFixed(3), +r.value.toFixed(3)], itemStyle: { color: V.temperature ? (r.value >= 0 ? "#D44A33" : "#2D5FD6") : NEUTRAL_SERIES } })),
        animationDelay: (i: number) => i * 2,
      },
    ],
  };

  const Key = ({ items }: { items: [string, string, boolean?][] }) => (
    <div className="mb-1 flex justify-end gap-4 text-[12px] text-muted">
      {items.map(([label, color, dashed]) => (
        <span key={label} className="flex items-center gap-2">
          <span aria-hidden className="inline-block w-[18px] border-t-2" style={{ borderColor: color, borderStyle: dashed ? "dashed" : "solid" }} />
          {label}
        </span>
      ))}
    </div>
  );

  return (
    <section aria-labelledby="anatomy" className="mx-auto mt-20 max-w-canvas px-5 md:px-side">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="anatomy" className="font-serif text-[36px] font-medium tracking-[-0.02em] text-text md:text-[44px]">
          Anatomy of the signal
        </h2>
        <p className="text-[14px] text-muted">Each figure answers one question</p>
      </div>
      <div className="anatomy-seq mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Figure n={6} className="lg:col-span-2" title="Annual series and trend" source={source} caption={`${a.annual.length} ${unitWord} means of ${V.name.toLowerCase()}, ${from}-${to}. The ${V.temperature ? "red" : "bright"} OLS line is the trend under test: ${signed(t.perDecade, V.digits)} ${C} per decade. Mann-Kendall, on the same series, gives ${pLabel(a.mk.p)} and a Sen's slope of ${signed(a.mk.senPerDecade, V.digits)} ${C} per decade.`}>
          <Key items={[["OLS trend", lineColor], [season === "ALL" ? "Annual mean" : `${season} mean`, pointColor]]} />
          <Chart height={300} option={series} label={`Line chart of ${a.annual.length} ${unitWord} means with the OLS trend line`} />
        </Figure>
        {V.temperature && (
          <TwoSourcesFigure
            n={7}
            className="lg:col-span-2"
            name={name}
            global={global}
            season={season}
            local={global ? null : a.annual}
            planet={global ? a.annual : planet?.analysis.annual ?? null}
            origin={global ? d.origin : planet?.origin}
            error={global ? undefined : planetError}
          />
        )}
        <Figure n={V.temperature ? 8 : 7} title="Seasonality" source={`${global ? gistempName(d.origin) : "NASA POWER (MERRA-2)"}, ${BASELINE_LABEL}.`} caption={V.temperature ? "The 1981-2010 seasonal cycle, removed before measuring the trend. Skip that step and an ordinary summer would pass for warming." : `The 1981-2010 seasonal cycle of ${V.name.toLowerCase()}, removed before measuring the trend, so an ordinary wet or windy season is never read as a trend.`}>
          <Chart option={clim} label={`Monthly climatology for ${BASELINE_LABEL}`} />
        </Figure>
        <Figure n={V.temperature ? 9 : 8} title="Residual" source={source} caption={V.temperature ? "What is left after removing the seasonal cycle and the trend. Red months ran warm, blue months cool." : `What is left after removing the seasonal cycle and the trend, in ${C}. Noisy residuals are why ${V.short.toLowerCase()} trends are often inconclusive.`}>
          <Chart option={resid} label={`Bar chart of monthly residuals in ${U}`} />
        </Figure>
        {!global && !V.temperature && (
          <Figure n={9} title="Second opinion: Mann-Kendall" source={source} caption="Mann-Kendall only asks whether later years tend to sit above earlier ones. It assumes no straight line and no bell curve, so a few extreme years cannot fake a trend. When it and the regression disagree, the verdict is Inconclusive.">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 py-2">
              {[
                ["S statistic", String(a.mk.s)],
                ["Z (continuity and tie corrected)", fixed(a.mk.z)],
                ["p value, two sided", pLabel(a.mk.p).replace("p ", "")],
                [`Sen's slope, ${U} per decade`, signed(a.mk.senPerDecade, V.digits)],
              ].map(([k, val]) => (
                <div key={k} className="border-t border-rule pt-3">
                  <dt className="text-[12.5px] text-muted">{k}</dt>
                  <dd className="mt-1 font-serif text-[30px] leading-none text-text tnum">{val}</dd>
                </div>
              ))}
            </dl>
            <p className={`mt-4 text-[14px] ${d.verdict.methodsAgree ? "text-body" : "font-semibold text-text"}`}>
              {d.verdict.methodsAgree ? "Agrees with the regression on significance." : "Methods disagree: treat as Inconclusive."}
            </p>
          </Figure>
        )}
      </div>
    </section>
  );
}

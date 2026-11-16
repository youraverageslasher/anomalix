"use client";

import { useEffect, useState } from "react";
import { Chart, AXIS_TEXT, GRID_LINE, TOOLTIP } from "./Chart";
import { DotGlobe } from "@/components/v6/DotGlobe";
import { brazilStateAt, brazilStates } from "@/components/v6/geo";
import { fixed, intLabel, pShort, signed } from "@/lib/data/fmt";
import { ANALOG_MAX_GAP, ANALOG_YEARS, findAnalog, lastYearsMean, type AnalogCell } from "@/lib/data/analog";
import { BONFERRONI_P, pullingSeason, seasonFits, type SeasonFit } from "@/lib/data/seasons";
import { bandwidth, highsShift, kde, SHIFT_YEARS } from "@/lib/data/shift";
import { VARIABLES, type VariableCode } from "@/lib/data/variables";
import type { DecadeGrid } from "@/lib/data/decades";
import type { MainData } from "./useReportData";
import decadesRaw from "../../../public/data/brazil-decades.json";
import { gistempName } from "@/lib/data/origin";

const DECADES = decadesRaw as DecadeGrid;
const STATE_NAMES = Object.fromEntries(brazilStates().map((f) => [f.properties.sigla, f.properties.nome]));
const pText = (p: number) => (pShort(p).startsWith("<") ? `p ${pShort(p)}` : `p = ${pShort(p)}`);
const latText = (lat: number) => `${Math.abs(lat).toFixed(1)}° ${lat < 0 ? "S" : "N"}`;
const lonText = (lon: number) => `${Math.abs(lon).toFixed(1)}° ${lon < 0 ? "W" : "E"}`;

function Shell({ title, kicker, children, className = "" }: { title: string; kicker: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={`rounded-card border border-rule bg-card p-6 shadow-card md:p-7 ${className}`}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-serif text-figure text-text">{title}</span>
        <span className="text-[12.5px] text-muted">{kicker}</span>
      </figcaption>
      {children}
    </figure>
  );
}

/* 1. Climate analog. Shown only for a significant temperature trend and a grid point within 0.3 °C. */
export function ClimateAnalog({ d, name, lat, lon, variable, global, wrapClassName = "" }: { d: MainData; name: string; lat: number; lon: number; variable: VariableCode; global: boolean; wrapClassName?: string }) {
  const [size, setSize] = useState(0);
  useEffect(() => {
    const set = () => setSize(window.innerWidth >= 1024 ? 420 : Math.min(340, window.innerWidth - 80));
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);
  if (global || variable !== "T2M" || d.verdict.confidence === "Inconclusive") return null;
  /* Data checks: the grid's first period must be ten years starting at the first valid year of this product. */
  const first = DECADES.decades[0];
  if (!first || first.to - first.from + 1 !== ANALOG_YEARS || !d.coverage || first.from !== d.coverage.firstComplete) return null;
  const cityMean = lastYearsMean(d.analysis.annual);
  if (cityMean === null) return null;
  const cells: AnalogCell[] = DECADES.cells.flatMap((c) => (c.v[0] === null || c.v[0] === undefined ? [] : [{ lat: c.lat, lon: c.lon, state: c.state, early: c.v[0] }]));
  if (cells.length === 0) return null;
  const a = findAnalog({ lat, lon, mean: cityMean }, cells);
  if (!a) return null;
  const sigla = brazilStateAt(a.cell.lon, a.cell.lat) ?? a.cell.state;
  const stateName = STATE_NAMES[sigla] ?? sigla;
  const tail = d.analysis.annual.slice(-ANALOG_YEARS);
  const short = name.split(",")[0];
  const where = a.closerToEquator ? `about ${intLabel(Math.round(a.latKm / 10) * 10)} km closer to the equator` : `about ${intLabel(Math.round(a.km / 10) * 10)} km away`;
  const focus: [number, number] = [(lon + a.cell.lon) / 2, Math.max(-60, Math.min(60, (lat + a.cell.lat) / 2))];
  return (
    <section aria-label="Climate analog" className={wrapClassName}>
    <Shell title="Climate analog" kicker="average temperature match" className="overflow-hidden">
      <div className="mt-4 grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div>
          <p className="text-[16px] leading-relaxed text-text">
            The last {ANALOG_YEARS} years in {short} ({tail[0].year}-{tail[tail.length - 1].year}) average <span className="tnum">{fixed(cityMean, 1)} °C</span>. That matches the first{" "}
            {ANALOG_YEARS} years ({first.from}-{first.to}) of the grid point near {stateName} ({latText(a.cell.lat)}, {lonText(a.cell.lon)}), {where}.
          </p>
          <p className="mt-3 text-[14px] text-body tnum">
            Gap between the two means: {fixed(a.gap, 2)} °C, under the {fixed(ANALOG_MAX_GAP, 1)} °C limit. Straight line distance {intLabel(Math.round(a.km))} km.
          </p>
          <p className="mt-4 text-[13.5px] font-semibold text-text">Average temperature match only. Elevation, rain and humidity differ.</p>
          <p className="mt-2 text-[12px] text-muted">
            {size > 0 && size < 400 ? `Red dot: ${short}. ` : ""}Searched among {intLabel(cells.length)} points of the 1 degree Brazil grid, NASA POWER T2M, MERRA-2 based. The point is named only by its coordinates and the state that contains it.
          </p>
        </div>
        <div className="flex justify-center">
          {size > 0 && (
            <DotGlobe
              size={size}
              focus={focus}
              rotate={false}
              arcDrawMs={1200}
              neutralBrazil
              markers={[
                { id: "city", lat, lon, tone: "searched", label: size >= 400 ? short : undefined },
                { id: "analog", lat: a.cell.lat, lon: a.cell.lon, label: `${latText(a.cell.lat)}, ${lonText(a.cell.lon)}` },
              ]}
              arcs={[{ from: [lon, lat], to: [a.cell.lon, a.cell.lat] }]}
              ariaLabel={`Globe with an arc from ${short} to the grid point at ${latText(a.cell.lat)}, ${lonText(a.cell.lon)} in ${stateName}`}
            />
          )}
        </div>
      </div>
    </Shell>
    </section>
  );
}

function SeasonCell({ f, max, unit, digits, pulling }: { f: SeasonFit; max: number; unit: string; digits: number; pulling: boolean }) {
  const t = f.trend;
  const pos = (v: number) => `${50 + (v / max) * 50}%`;
  return (
    <div className={`rounded-card-sm border p-4 ${pulling ? "border-text bg-highlight" : "border-rule"}`}>
      <p className="label">{f.label}</p>
      <p className="mt-2 font-serif text-[28px] leading-none text-text tnum">
        {signed(t.perDecade, digits)}
        <span className="ml-1 font-sans text-[12px] text-muted">{unit}/decade</span>
      </p>
      <div className="relative mt-3 h-[14px]" role="img" aria-label={`${f.label}: ${signed(t.perDecade, digits)} plus or minus ${fixed(t.ci95PerDecade, digits)}`}>
        <span className="absolute left-1/2 top-0 h-full w-px bg-rule" />
        <span className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-muted" style={{ left: pos(t.ciLow), right: `calc(100% - ${pos(t.ciHigh)})` }} />
        <span className={`absolute top-1/2 h-[10px] w-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full ${f.strict ? "bg-text" : "border border-muted bg-card"}`} style={{ left: pos(t.perDecade) }} />
      </div>
      <p className="mt-2 text-[12.5px] text-body tnum">
        ± {fixed(t.ci95PerDecade, digits)} · {pText(t.p)}
      </p>
      <p className="text-[12px] text-muted tnum">
        adjusted {pText(t.pAdj)} · {f.strict ? "passes the stricter bar" : "does not pass the stricter bar"}
      </p>
    </div>
  );
}

/* 2. Seasons, labeled by months. A season is named only when it passes Bonferroni and the rigor checks. */
export function Seasons({ d, variable, global = false }: { d: MainData; variable: VariableCode; global?: boolean }) {
  if (!d.months?.length) return null;
  const fits = seasonFits(d.months);
  if (!fits) return null;
  const V = VARIABLES[variable];
  const conclusive = d.verdict.confidence !== "Inconclusive";
  const direction = conclusive ? (Math.sign(d.analysis.trend.perDecade) as -1 | 0 | 1) : 0;
  const pull = pullingSeason(fits, direction);
  const steepest = direction === 0 ? (pull && pull.trend.perDecade < 0 ? "decline" : "rise") : direction < 0 ? "decline" : "rise";
  const max = Math.max(...fits.map((f) => Math.max(Math.abs(f.trend.ciLow), Math.abs(f.trend.ciHigh)))) || 1;
  const first = fits[0].series[0]?.year;
  const last = fits[0].series[fits[0].series.length - 1]?.year;
  return (
    <Shell title="Seasons" kicker={`calendar quarters, ${first}-${last}`}>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fits.map((f) => (
          <SeasonCell key={f.id} f={f} max={max} unit={V.unit} digits={V.digits} pulling={pull?.id === f.id} />
        ))}
      </div>
      <p className={`mt-4 text-[14.5px] leading-relaxed ${pull ? "font-semibold text-text" : "text-body"}`}>
        {pull
          ? direction === 0
            ? `${pull.label} moves the most: the steepest ${steepest} among the seasons that pass the stricter bar, while the yearly trend is inconclusive.`
            : `${pull.label} is pulling the ${V.temperature && direction > 0 ? "warming" : "trend"}: the steepest ${steepest} among the seasons that pass the stricter bar.`
          : "No single season stands out."}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        Four tests, so the bar is stricter: p and the autocorrelation adjusted p must both be under {fixed(BONFERRONI_P, 4)} (Bonferroni), with Theil-Sen and Mann-Kendall agreeing. Dec to Feb uses January, February and December of the same calendar year.
      </p>
      <p className="mt-2 text-[12px] text-muted">{global ? `${gistempName(d.origin)}, global monthly means.` : `NASA POWER ${V.code}, MERRA-2 based, monthly.`}</p>
    </Shell>
  );
}

/* 3. Average daily highs: first and last fifteen years, as two small density curves. */
export function HighsShift({ d, global }: { d: MainData; global: boolean }) {
  if (global || !d.dayNight || !d.dayNight.ok) return null;
  const max = d.dayNight.max;
  const s = highsShift(max.annual);
  if (!s) return null;
  const e = s.early.map((p) => p.value);
  const l = s.late.map((p) => p.value);
  const all = [...e, ...l];
  const h = bandwidth(all);
  if (!Number.isFinite(h) || h <= 0) return null;
  const lo = Math.floor(Math.min(...all) - 3 * h);
  const hi = Math.ceil(Math.max(...all) + 3 * h);
  const grid = Array.from({ length: 121 }, (_, i) => lo + ((hi - lo) * i) / 120);
  const de = kde(e, grid, h);
  const dl = kde(l, grid, h);
  const ew = `${s.early[0].year}-${s.early[s.early.length - 1].year}`;
  const lw = `${s.late[0].year}-${s.late[s.late.length - 1].year}`;
  const claim = s.test.p < 0.05 && s.rose && max.verdict.confidence !== "Inconclusive";
  const option = {
    grid: { left: 40, right: 12, top: 12, bottom: 28 },
    tooltip: { ...TOOLTIP, trigger: "axis", axisPointer: { ...TOOLTIP.axisPointer, type: "line" }, valueFormatter: (v: number) => v.toFixed(3) },
    xAxis: { type: "value", min: lo, max: hi, axisLabel: { ...AXIS_TEXT, hideOverlap: true, formatter: (v: number) => `${v.toFixed(0)} °C` }, axisLine: { lineStyle: { color: "#2B323C" } }, axisTick: { show: false }, splitLine: { show: false } },
    yAxis: { type: "value", axisLabel: { show: false }, splitLine: GRID_LINE },
    series: [
      { name: `First ${SHIFT_YEARS} years, ${ew}`, type: "line", smooth: true, symbol: "none", data: grid.map((g, i) => [+g.toFixed(3), +de[i].toFixed(4)]), lineStyle: { color: "#ECEEF1", width: 2, type: "dashed" }, itemStyle: { color: "#ECEEF1" } },
      { name: `Last ${SHIFT_YEARS} years, ${lw}`, type: "line", smooth: true, symbol: "none", data: grid.map((g, i) => [+g.toFixed(3), +dl[i].toFixed(4)]), lineStyle: { color: "#EF5A4C", width: 2.4 }, itemStyle: { color: "#EF5A4C" }, areaStyle: { color: "rgba(239,90,76,0.08)" } },
    ],
  };
  return (
    <Shell title="Daily highs shift" kicker="average daily high, not extreme events">
      <div className="mt-3 flex flex-wrap justify-end gap-4 text-[12px] text-muted">
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block w-[18px] border-t-2 border-dashed border-text" />
          {ew}
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block w-[18px] border-t-2 border-signal" />
          {lw}
        </span>
      </div>
      <Chart height={200} option={option} label={`Density of the yearly average daily high, ${ew} against ${lw}`} />
      <p className={`mt-3 text-[14.5px] leading-relaxed ${claim ? "font-semibold text-text" : "text-body"}`}>
        {claim
          ? `Years hotter than 1 in 10 of the early years (${ew}) are now ${s.aboveP90} in ${SHIFT_YEARS}.`
          : "No clear shift in average daily highs."}
      </p>
      <p className="mt-2 text-[13px] text-body tnum">
        Median {fixed(s.medianEarly, 2)} °C then, {fixed(s.medianLate, 2)} °C now · Mann-Whitney U {fixed(s.test.u, 1)}, {pText(s.test.p)}
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-muted">
        Yearly mean of the monthly T2M_MAX values from NASA POWER, MERRA-2 based. Each curve is only {SHIFT_YEARS} values, a small sample, smoothed with a Gaussian kernel. The line is claimed only when the test gives p under 0.05, the median rose and the daily high trend itself passes the rigor checks.
      </p>
    </Shell>
  );
}

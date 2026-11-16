"use client";

import { useEffect, useState } from "react";
import grid from "../../../public/data/brazil-grid.json";
import { useLoad } from "./useReportData";
import { alignTwoSources } from "@/lib/data/twoSource";
import { bandFor, ZONAL_URL, type ZonalSeries } from "@/lib/data/zonal";
import { patternScaling } from "@/lib/data/scaling";
import { Chart, AXIS_TEXT, GRID_LINE, TOOLTIP } from "./Chart";
import { pShort } from "@/lib/data/fmt";
import { fixed, signed } from "@/lib/data/fmt";
import { rollingWindows, windowStory, MIN_SERIES_YEARS, WINDOW_YEARS } from "@/lib/data/windows";
import { VARIABLES, type VariableCode } from "@/lib/data/variables";
import type { MainData } from "./useReportData";
import { hottestMonth, IMAGE_DAY, PAD_DEG, validCoords, worldviewUrl } from "@/lib/data/worldview";
import { gistempName, utcDate } from "@/lib/data/origin";

/* Rolling 25 year windows of the active variable. Hidden when the series has fewer than 35 years. */
export function WindowStability({ d, variable, global = false }: { d: MainData; variable: VariableCode; global?: boolean }) {
  const windows = rollingWindows(d.analysis.annual);
  if (!windows || windows.length === 0) return null;
  const V = VARIABLES[variable];
  const sig = d.verdict.confidence !== "Inconclusive";
  const sign = d.analysis.trend.perDecade > 0 ? 1 : d.analysis.trend.perDecade < 0 ? -1 : 0;
  const story = windowStory(windows, sig, sign);
  const n = windows.length;
  const upColor = V.temperature ? "#EF5A4C" : "#ECEEF1";
  const downColor = V.temperature ? "#2D5FD6" : "#8D97A6";
  const sentence =
    story.kind === "robust"
      ? story.k === story.n
        ? `All ${story.n} windows of ${WINDOW_YEARS} years show a significant ${story.direction > 0 ? "rise" : "decline"}, whatever the start year.`
        : `${story.k} of ${story.n} windows of ${WINDOW_YEARS} years (${Math.round((100 * story.k) / story.n)}%) show a significant ${story.direction > 0 ? "rise" : "decline"}.`
      : story.kind === "flips"
        ? `The slope changes sign across ${story.m} of ${story.n} windows, which supports the Inconclusive verdict.`
        : `${story.k} of ${story.n} windows pass the significance rule; ${story.up} have a rising slope and ${story.down} a falling one.`;
  return (
    <section aria-label="Window stability" className="mx-auto mt-6 max-w-canvas px-5 md:px-side">
      <figure className="rounded-card border border-rule bg-card p-6 shadow-card md:p-7">
        <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-serif text-figure text-text">Window stability</span>
          <span className="text-[12.5px] text-muted">
            every {WINDOW_YEARS} year window, {windows[0].from}-{windows[n - 1].to}
          </span>
        </figcaption>
        <div className="mt-5 flex gap-[3px]" role="img" aria-label={`${n} windows. ${sentence}`}>
          {windows.map((w) => {
            const c = w.sign >= 0 ? upColor : downColor;
            return (
              <span
                key={w.from}
                title={`${w.from}-${w.to}: ${signed(w.trend.perDecade, V.digits)} ${V.unit} per decade, adjusted p ${fixed(w.trend.pAdj, 3)}${w.significant ? ", significant" : ""}`}
                className="h-[34px] min-w-0 flex-1 rounded-[3px]"
                style={{ background: w.significant ? c : "transparent", boxShadow: `inset 0 0 0 1.5px ${c}` }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[12px] text-muted tnum">
          <span>starts {windows[0].from}</span>
          <span>starts {windows[n - 1].from}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-[10px] w-[14px] rounded-[2px]" style={{ background: upColor }} />
            rising, significant
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-[10px] w-[14px] rounded-[2px]" style={{ boxShadow: `inset 0 0 0 1.5px ${upColor}` }} />
            rising, not significant
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-[10px] w-[14px] rounded-[2px]" style={{ background: downColor }} />
            falling, significant
          </span>
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-[10px] w-[14px] rounded-[2px]" style={{ boxShadow: `inset 0 0 0 1.5px ${downColor}` }} />
            falling, not significant
          </span>
        </div>
        <p className={`mt-4 text-[14.5px] leading-relaxed ${story.kind === "count" ? "text-body" : "font-semibold text-text"}`}>{sentence}</p>
        <p className="mt-2 text-[12px] leading-relaxed text-muted">
          Windows overlap, so they are not independent tests. Each window uses the same rule as the headline: OLS, Mann-Kendall, Theil-Sen and the p adjusted for autocorrelation must agree. Shown only for series of at least {MIN_SERIES_YEARS} years.
        </p>
        <p className="mt-2 text-[12px] text-muted">{global ? `${gistempName(d.origin)}, global monthly means.` : `NASA POWER ${V.code}, MERRA-2 based, monthly.`}</p>
      </figure>
    </section>
  );
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/* A picture of the searched place on its hottest month against normal; hidden when no such month or coordinates exist. */
export function WorldviewLink({ d, lat, lon, variable, global }: { d: MainData; lat: number; lon: number; variable: VariableCode; global: boolean }) {
  if (global || variable !== "T2M" || !validCoords(lat, lon) || !d.months?.length) return null;
  const hot = hottestMonth(d.months, undefined, lat);
  if (!hot) return null;
  const href = worldviewUrl(lat, lon, hot.date);
  return (
    <section aria-label="NASA Worldview" className="mx-auto mt-6 max-w-canvas px-5 md:px-side">
      <div className="flex flex-col gap-3 rounded-card border border-rule bg-card px-6 py-5 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-[44px] items-center gap-2 rounded-full border border-highlight-border px-5 text-[14px] font-medium text-text transition-colors hover:bg-highlight focus:outline-none focus-visible:ring-2 focus-visible:ring-text/70"
          >
            Inspect the territory in NASA Worldview <span aria-hidden>↗</span>
          </a>
          <p className="mt-3 text-[13.5px] text-body">
            Image date: {MONTH_NAMES[hot.month - 1]} {hot.year}, the hottest month vs normal in this series ({signed(hot.anomaly, 1)} °C){Math.abs(lat) >= 60 ? ", among months with daylight" : ""}. A picture of the place, not a test of the trend.
          </p>
        </div>
        <p className="max-w-[360px] text-[12px] leading-relaxed text-muted">
          MODIS Terra true color with coastlines, {PAD_DEG}° around the point, day {IMAGE_DAY} of that month. Clouds or a satellite swath edge can cover part of the view.
        </p>
      </div>
    </section>
  );
}

const STATE_ROWS = grid.states as { sigla: string; name: string; value: number }[];

/* Side by side: the place, its Brazilian state (grid), its latitude band and the planet. Hidden on any failed check. */
export function ZonalComparison({ d, lat, name, variable, global, sigla }: { d: MainData; lat: number; name: string; variable: VariableCode; global: boolean; sigla: string | null }) {
  const active = !global && variable === "T2M" && d.verdict.confidence !== "Inconclusive";
  const z = useLoad<ZonalSeries>(active ? "/api/zonal" : null);
  const [accessed, setAccessed] = useState("");
  useEffect(() => setAccessed(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })), []);
  if (!active || z.status !== "ready") return null;
  const band = bandFor(lat);
  if (!band) return null;
  const b = alignTwoSources(d.analysis.annual, z.data.bands[band]);
  const g = alignTwoSources(d.analysis.annual, z.data.global);
  if (!b || !g || b.years.length !== g.years.length) return null;
  const years = `${b.years[0]}-${b.years[b.years.length - 1]}`;
  const state = sigla ? STATE_ROWS.find((s) => s.sigla === sigla) ?? null : null;
  const steps: { label: string; sub: string; value: number; ci: number | null }[] = [
    { label: name.split(",")[0], sub: `NASA POWER cell, ${years}`, value: b.local.trend.perDecade, ci: b.local.trend.ci95PerDecade },
    ...(state ? [{ label: state.name, sub: `state mean of the 1° grid, ${grid.period}`, value: state.value, ci: null }] : []),
    { label: `Band ${band}`, sub: `GISTEMP zonal mean, ${years}`, value: b.global.trend.perDecade, ci: b.global.trend.ci95PerDecade },
    { label: "Planet", sub: `GISTEMP global mean, ${years}`, value: g.global.trend.perDecade, ci: g.global.trend.ci95PerDecade },
  ];
  return (
    <section aria-label="Side by side comparison" className="mx-auto mt-6 max-w-canvas px-5 md:px-side">
      <figure className="rounded-card border border-rule bg-card p-6 shadow-card md:p-7">
        <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-serif text-figure text-text">From the place to the planet</span>
          <span className="text-[12.5px] text-muted">side by side comparison, °C per decade</span>
        </figcaption>
        <ol className={`mt-5 grid grid-cols-2 gap-3 ${steps.length === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {steps.map((s, i) => (
            <li key={s.label} className="rounded-card-sm border border-rule p-4">
              <p className="text-[12px] text-muted tnum">Step {i + 1}</p>
              <p className="mt-1 font-serif text-[18px] leading-tight text-text">{s.label}</p>
              <p className="mt-2 font-serif text-[30px] leading-none text-text tnum">{signed(s.value)}</p>
              <p className="mt-2 text-[12.5px] text-body tnum">{s.ci === null ? "grid value, no interval" : `± ${fixed(s.ci)} at 95%`}</p>
              <p className="mt-1 text-[12px] text-muted">{s.sub}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[13.5px] leading-relaxed text-body">
          A side by side comparison, not proof of anything about the place. The place, band and planet use the same {b.years.length} years; the state value comes from the Brazil grid over its own period.
        </p>
        <p className="mt-2 break-words text-[12px] text-muted">
          Sources: NASA POWER monthly point API; {ZONAL_URL}
          {z.data.origin?.kind === "snapshot" ? ` (bundled snapshot fetched ${utcDate(z.data.origin.fetchedAt)}, live file unreachable)` : accessed ? ` (accessed ${accessed})` : ""}.
        </p>
      </figure>
    </section>
  );
}

/* Local yearly anomalies against global ones, same years. Temperature, searched place only; hidden on any failed check. */
export function PatternScaling({ d, planet, variable, global, name }: { d: MainData; planet: MainData | null; variable: VariableCode; global: boolean; name: string }) {
  if (global || variable !== "T2M" || !planet) return null;
  const s = patternScaling(d.analysis.annual, planet.analysis.annual);
  if (!s || !Number.isFinite(s.beta) || !Number.isFinite(s.r2)) return null;
  const short = name.split(",")[0];
  const ref = `${s.reference.from}-${s.reference.to}`;
  const pts = s.years.map((yr, i) => [+s.x[i].toFixed(3), +s.y[i].toFixed(3), yr]);
  const option = {
    grid: { left: 52, right: 16, top: 16, bottom: 36 },
    tooltip: {
      ...TOOLTIP,
      trigger: "item",
      formatter: (p: { seriesName: string; value: [number, number, number] }) =>
        p.seriesName === "Years" ? `<b>${p.value[2]}</b><br/>global ${signed(p.value[0])} °C<br/>${short} ${signed(p.value[1])} °C` : "",
    },
    xAxis: { type: "value", min: Math.floor(Math.min(...s.x) * 10) / 10, max: Math.ceil(Math.max(...s.x) * 10) / 10, name: "Global anomaly, °C", nameLocation: "middle", nameGap: 24, nameTextStyle: { color: "#8D97A6", fontSize: 11 }, axisLabel: { ...AXIS_TEXT, formatter: (v: number) => signed(v, 1) }, splitLine: { show: false }, axisLine: { lineStyle: { color: "#2B323C" } } },
    yAxis: { type: "value", axisLabel: { ...AXIS_TEXT, formatter: (v: number) => `${signed(v, 1)} °C` }, splitLine: GRID_LINE },
    series: [
      {
        name: "95% band",
        type: "custom",
        silent: true,
        tooltip: { show: false },
        data: [[0, 0]],
        renderItem: (_: unknown, api: { coord: (v: [number, number]) => [number, number] }) => ({
          type: "polygon",
          shape: { points: [...s.band.map((p) => api.coord([p.x, p.lo])), ...[...s.band].reverse().map((p) => api.coord([p.x, p.hi]))] },
          style: { fill: "rgba(236,238,241,0.12)" },
        }),
        z: 1,
      },
      { name: "OLS fit", type: "line", data: [s.band[0], s.band[s.band.length - 1]].map((b) => [+b.x.toFixed(3), +(s.fit.intercept + s.beta * b.x).toFixed(3)]), symbol: "none", lineStyle: { color: "#ECEEF1", width: 2 }, silent: true, tooltip: { show: false } },
      { name: "Years", type: "scatter", data: pts, symbolSize: 7, itemStyle: { color: "#EF5A4C", opacity: 0.9 } },
    ],
  };
  return (
    <section aria-label="Pattern scaling" className="mx-auto mt-6 max-w-canvas px-5 md:px-side">
      <figure className="rounded-card border border-rule bg-card p-6 shadow-card md:p-7">
        <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-serif text-figure text-text">Pattern scaling</span>
          <span className="text-[12.5px] text-muted">one dot per year, {s.years.length} common years</span>
        </figcaption>
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-center">
          <Chart height={300} option={option} label={`Scatter of ${short} yearly anomalies against global anomalies, ${ref}, with the OLS fit and its 95% band`} />
          <div>
            <p className="text-[16px] leading-relaxed text-text">
              About <span className="tnum">{fixed(s.beta, 2)} °C</span> of local change for each 1 °C of global change (R squared <span className="tnum">{fixed(s.r2, 2)}</span>).
            </p>
            <p className="mt-2 text-[13.5px] text-body">The local annual temperature anomaly regressed on the global NASA GISTEMP annual anomaly, same years; beta is in °C per °C of global change.</p>
            <p className="mt-2 text-[13.5px] text-body tnum">
              beta {fixed(s.beta, 2)} ± {fixed(s.betaHalf, 2)} °C per °C at 95% · p {pShort(s.fit.p)} · adjusted for autocorrelation p {pShort(s.fit.pAdj)}
            </p>
            <p className="mt-2 text-[13.5px] text-body tnum">Year to year link: r = {fixed(s.detrendedR, 2)}</p>
            <p className={`mt-4 text-[14.5px] leading-relaxed ${s.movesWith ? "font-semibold text-text" : "text-body"}`}>
              {s.movesWith
                ? "This place's long-term trend rises with the planet's."
                : "In this period the local record is only weakly tied to the global signal. Local factors may be masking it, and this panel cannot say which."}
            </p>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              Both series trend upward in time, so a high R squared mostly reflects the shared trend. The year to year link correlates the two series after each is detrended with its own line; an r near zero means they share the long-term trend but not the yearly ups and downs. Anomalies are against each series&apos; own mean over {ref}. A pattern, not a cause.
            </p>
            <p className="mt-2 text-[12px] text-muted">NASA POWER T2M, MERRA-2 based, and {gistempName(planet.origin)} global means.</p>
          </div>
        </div>
      </figure>
    </section>
  );
}

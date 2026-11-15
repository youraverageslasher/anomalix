"use client";

import { Chart, AXIS_TEXT, GRID_LINE, TOOLTIP } from "@/components/report/Chart";
import { CountUp } from "@/components/v6/motion";
import { fixed, pLabel, signed, intLabel } from "@/lib/data/fmt";
import type { Analysis } from "@/lib/data/analyze";

export function StatsVisual({ a, from, to }: { a: Analysis; from: number; to: number }) {
  const t = a.trend;
  const xs = a.annual.map((p) => p.year);
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const sxx = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const s = t.se * Math.sqrt(sxx);
  const fit = (x: number) => t.intercept + t.slopePerYear * x;
  const half = (x: number) => t.tCrit * s * Math.sqrt(1 / n + (x - mx) ** 2 / sxx);
  const lower = xs.map((x) => [x, +(fit(x) - half(x)).toFixed(3)]);
  const width = xs.map((x) => [x, +(2 * half(x)).toFixed(3)]);
  const vals = [...a.annual.map((p) => p.value), ...xs.map((x) => fit(x) - half(x)), ...xs.map((x) => fit(x) + half(x))];
  const yMin = Math.floor(Math.min(...vals) - 0.5);
  const yMax = Math.ceil(Math.max(...vals) + 0.5);
  const option = {
    grid: { left: 56, right: 16, top: 16, bottom: 28 },
    tooltip: { ...TOOLTIP, trigger: "axis", valueFormatter: (v: number) => `${v.toFixed(2)} °C` },
    xAxis: { type: "value", min: from, max: to, splitNumber: 5, axisLabel: { ...AXIS_TEXT, formatter: (v: number) => String(Math.round(v)) }, axisLine: { lineStyle: { color: "#2B323C" } }, axisTick: { show: false }, splitLine: { show: false } },
    yAxis: { type: "value", min: yMin, max: yMax, axisLabel: { ...AXIS_TEXT, formatter: (v: number) => `${v.toFixed(0)} °C` }, splitLine: GRID_LINE, axisLine: { show: false }, axisTick: { show: false } },
    series: [
      { name: "band low", type: "line", stack: "ci", stackStrategy: "all", data: lower, symbol: "none", lineStyle: { opacity: 0 }, tooltip: { show: false }, silent: true },
      { name: "95% interval", type: "line", stack: "ci", stackStrategy: "all", data: width, symbol: "none", lineStyle: { opacity: 0 }, areaStyle: { color: "rgba(239,90,76,0.18)" }, tooltip: { show: false }, silent: true },
      { name: "Annual mean", type: "line", data: a.annual.map((p) => [p.year, +p.value.toFixed(3)]), symbol: "circle", symbolSize: 5, lineStyle: { color: "#ECEEF1", width: 1.2 }, itemStyle: { color: "#ECEEF1" } },
      { name: "OLS line", type: "line", data: [[from, +fit(from).toFixed(3)], [to, +fit(to).toFixed(3)]], symbol: "none", lineStyle: { color: "#EF5A4C", width: 2.6 }, itemStyle: { color: "#EF5A4C" } },
    ],
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-rule bg-card p-5 shadow-card">
        <div className="mb-2 flex flex-wrap justify-end gap-4 text-[12px] text-muted">
          <span className="flex items-center gap-2"><span aria-hidden className="inline-block w-[18px] border-t-2 border-signal" />OLS line</span>
          <span className="flex items-center gap-2"><span aria-hidden className="inline-block h-[10px] w-[18px] rounded-[2px] bg-[rgba(239,90,76,0.3)]" />95% interval of the line</span>
          <span className="flex items-center gap-2"><span aria-hidden className="inline-block w-[18px] border-t-2 border-text" />Annual mean</span>
        </div>
        <Chart option={option} label="Annual means with the fitted OLS line and its 95% interval band" height={300} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card-hover rounded-card-sm border border-rule bg-card p-5">
          <p className="label">Test 1 · Linear regression (OLS)</p>
          <p className="mt-3 font-serif text-[52px] leading-none text-text">
            <CountUp value={t.perDecade} format={(v) => signed(v)} />
          </p>
          <p className="mt-2 text-[13.5px] text-body tnum">°C per decade · ± {fixed(t.ci95PerDecade)} at 95% · regression {pLabel(t.p)} (t test, {t.df} df)</p>
        </div>
        <div className="card-hover rounded-card-sm border border-rule bg-card p-5">
          <p className="label">Test 2 · Mann-Kendall: Z, p, Sen&apos;s slope</p>
          <p className="mt-3 font-serif text-[52px] leading-none text-text tnum">Z {fixed(a.mk.z)}</p>
          <p className="mt-2 text-[13.5px] text-body tnum">
            {pLabel(a.mk.p)} · Sen&apos;s slope {signed(a.mk.senPerDecade)} °C per decade · S = {intLabel(a.mk.s)} across {n} years.
          </p>
        </div>
      </div>
      <p className={`rounded-card-sm border px-5 py-3 text-[14px] ${a.trend.p < 0.05 === a.mk.p < 0.05 ? "border-rule bg-card text-body" : "border-dashed border-highlight-border bg-card font-semibold text-text"}`}>
        {a.trend.p < 0.05 === a.mk.p < 0.05 ? "The two methods agree on significance." : "Methods disagree: treat as Inconclusive."}
      </p>
    </div>
  );
}

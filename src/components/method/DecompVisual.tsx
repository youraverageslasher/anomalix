"use client";

import { BASELINE_LABEL } from "@/lib/data/analyze";
import { Chart, AXIS_TEXT, GRID_LINE, TOOLTIP } from "@/components/report/Chart";
import { useInView } from "@/components/v6/motion";
import { signed } from "@/lib/data/fmt";
import type { Analysis } from "@/lib/data/analyze";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const GRID = { left: 52, right: 12, top: 10, bottom: 24 };
const yAxis = (digits = 0) => ({ type: "value", scale: true, splitNumber: 3, axisLabel: { ...AXIS_TEXT, formatter: (v: number) => `${v.toFixed(digits)} °C` }, splitLine: GRID_LINE, axisLine: { show: false }, axisTick: { show: false } });
const xYears = (a: number, b: number, last = b) => ({ type: "value", min: a, max: b, splitNumber: 4, axisLabel: { ...AXIS_TEXT, formatter: (v: number) => (v > last ? "" : String(Math.round(v))) }, axisLine: { lineStyle: { color: "#2B323C" } }, axisTick: { show: false }, splitLine: { show: false } });

function Panel({ title, note, i, children, shown }: { title: string; note: string; i: number; children: React.ReactNode; shown: boolean }) {
  return (
    <div className="decomp-panel rounded-card-sm border border-rule bg-card p-4 shadow-card" style={{ transform: shown ? "none" : `translateY(${-i * 70}px)`, opacity: shown ? 1 : i === 0 ? 1 : 0.35, transitionDelay: `${i * 120}ms`, zIndex: 3 - i }}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold text-text">{title}</p>
        <p className="text-[12px] text-muted">{note}</p>
      </div>
      {children}
    </div>
  );
}

export function DecompVisual({ a, months, from, to }: { a: Analysis; months: { year: number; month: number; value: number }[]; from: number; to: number }) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "0px 0px -25% 0px" });
  const t = (y: number, m: number) => y + (m - 0.5) / 12;
  const series = {
    grid: GRID,
    tooltip: { ...TOOLTIP, trigger: "axis", valueFormatter: (v: number) => `${v.toFixed(1)} °C` },
    xAxis: xYears(from, to + 1, to),
    yAxis: yAxis(),
    series: [{ name: "Monthly mean", type: "line", data: months.map((m) => [+t(m.year, m.month).toFixed(3), m.value]), symbol: "none", lineStyle: { color: "#ECEEF1", width: 1 }, itemStyle: { color: "#ECEEF1" } }],
  };
  const cycle = {
    grid: GRID,
    tooltip: { ...TOOLTIP, trigger: "axis", valueFormatter: (v: number) => `${v.toFixed(1)} °C` },
    xAxis: { type: "category", data: MONTHS, axisLabel: AXIS_TEXT, axisLine: { lineStyle: { color: "#2B323C" } }, axisTick: { show: false } },
    yAxis: yAxis(),
    series: [{ name: `${BASELINE_LABEL} mean`, type: "line", smooth: 0.4, data: a.climatology.map((v) => +v.toFixed(2)), symbol: "circle", symbolSize: 6, lineStyle: { color: "#ECEEF1", width: 2 }, itemStyle: { color: "#161A21", borderColor: "#ECEEF1", borderWidth: 1.5 } }],
  };
  const resid = {
    grid: GRID,
    tooltip: { ...TOOLTIP, trigger: "axis", axisPointer: { ...TOOLTIP.axisPointer, type: "line" }, valueFormatter: (v: number) => `${signed(v)} °C` },
    xAxis: xYears(from, to + 1, to),
    yAxis: yAxis(),
    series: [{ name: "Residual", type: "bar", barWidth: "70%", data: a.residual.map((r) => ({ value: [+r.t.toFixed(3), +r.value.toFixed(3)], itemStyle: { color: r.value >= 0 ? "#D44A33" : "#2D5FD6" } })) }],
  };
  const range = (xs: number[]) => (xs.length ? Math.max(...xs) - Math.min(...xs) : NaN);
  const swing = range(a.climatology);
  return (
    <div ref={ref} className="relative flex flex-col gap-4">
      <Panel i={0} shown={inView} title="Series" note={`${months.length} monthly values as measured`}>
        <Chart option={series} label="Monthly temperature series" height={170} />
      </Panel>
      <Panel i={1} shown={inView} title="Cycle" note={`Seasonal swing of ${swing.toFixed(1)} °C, removed first`}>
        <Chart option={cycle} label={`Seasonal cycle, ${BASELINE_LABEL}`} height={150} />
      </Panel>
      <Panel i={2} shown={inView} title="Residual" note="What is left once cycle and trend are gone">
        <Chart option={resid} label="Monthly residual bars" height={150} />
      </Panel>
    </div>
  );
}

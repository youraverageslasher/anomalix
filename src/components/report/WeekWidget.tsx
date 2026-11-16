"use client";

import { useEffect, useState } from "react";
import type { WeekDay, WeekReport } from "@/lib/data/week";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; data: WeekReport };

const r0 = (v: number | null) => (v === null || !Number.isFinite(v) ? "n/a" : `${Math.round(v)}°`);

function context(d: WeekDay): string {
  const c = d.climate;
  const parts = [`historically rains ${Math.round(c.rainFreq * 100)}% of these days`];
  if (d.tmax !== null && d.tmax > c.tmaxP90) parts.push("high above the 90th percentile for this date");
  else if (d.tmax !== null && d.tmax < c.tmaxP10) parts.push("high below the 10th percentile for this date");
  else parts.push(`typical high ${Math.round(c.tmaxP10)}° to ${Math.round(c.tmaxP90)}°`);
  return parts.join(" · ");
}

/* Seven days of weather against 45 years of climate for the same cell. Hidden behind a summary line; never blocks the report. */
export function WeekWidget({ lat, lon }: { lat: number; lon: number }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    setState({ status: "loading" });
    fetch(`/api/week?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, { signal: ctrl.signal })
      .then(async (r) => (r.ok ? setState({ status: "ready", data: await r.json() }) : setState({ status: "error" })))
      .catch(() => setState({ status: "error" }))
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [lat, lon]);

  if (state.status === "error") {
    return <p className="mx-auto mt-4 max-w-canvas px-5 text-[12.5px] text-muted md:px-side">This week&apos;s forecast is not available right now. The climate report below is unaffected.</p>;
  }
  if (state.status === "loading") {
    return (
      <p className="mx-auto mt-4 max-w-canvas px-5 text-[12.5px] text-muted md:px-side" aria-live="polite">
        Loading this week&apos;s forecast…
      </p>
    );
  }
  const w = state.data;
  return (
    <section aria-label="This week vs the climate record" className="mx-auto mt-6 max-w-canvas px-5 md:px-side">
      <details className="group rounded-card border border-rule bg-card shadow-card">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 md:px-6">
          <span>
            <span className="label block">This week vs {w.lastYear - w.firstYear + 1} years of climate</span>
            <span className="mt-1 block text-[15px] leading-relaxed text-text">{w.summary}</span>
          </span>
          <span aria-hidden className="mt-1 text-[13px] text-muted transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="border-t border-rule px-5 pb-5 pt-4 md:px-6">
          <ul className="divide-y divide-rule">
            {w.days.map((d) => (
              <li key={d.date} className="grid grid-cols-[56px_1fr] gap-x-4 gap-y-1 py-3 sm:grid-cols-[72px_140px_120px_1fr] sm:items-baseline">
                <span className="text-[14px] font-semibold text-text">
                  {d.weekday} <span className="font-normal text-muted">{d.date.slice(8)}</span>
                </span>
                <span className="text-[14px] text-text tnum">
                  {r0(d.tmax)} / {r0(d.tmin)}
                </span>
                <span className="text-[14px] text-body tnum sm:col-auto">{d.rainProb === null ? "rain n/a" : `${d.rainProb}% rain`}</span>
                <span className="col-span-2 text-[13px] text-muted sm:col-span-1">{context(d)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12px] leading-relaxed text-muted">
            Climate window: the {w.days[0]?.climate.n ? `${w.days[0].climate.n} days` : "days"} within 15 days of each date, {w.firstYear}-{w.lastYear}. Rain day: 1 mm or more. The forecast is a
            point model and the climate is a 0.5° by 0.625° grid cell, so compare them loosely.
          </p>
          <p className="mt-2 text-[12px] font-semibold leading-relaxed text-text">
            Forecast is weather (days), the rest of this page is climate (decades). Forecast: Open-Meteo. Climate: NASA POWER.
          </p>
        </div>
      </details>
    </section>
  );
}

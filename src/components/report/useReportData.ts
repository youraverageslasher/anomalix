"use client";

import { useEffect, useState } from "react";
import type { Analysis } from "@/lib/data/analyze";
import type { Verdict } from "@/lib/data/verdict";
import type { CompareRow } from "@/lib/data/compare-types";
import type { ReportParams } from "./params";
import type { VariableCode } from "@/lib/data/variables";
import type { Coverage } from "@/lib/data/range";
import type { ExtremeFit } from "@/lib/data/daynight";
import { POWER_START } from "@/lib/data/power";
import type { DataOrigin } from "@/lib/data/origin";

export interface MainData {
  variable?: VariableCode;
  analysis: Analysis;
  verdict: Verdict;
  cell?: { lat: number; lon: number };
  elevation?: number | null;
  months?: { year: number; month: number; value: number }[];
  coverage?: Coverage | null;
  dayNight?: { ok: true; max: ExtremeFit; min: ExtremeFit } | { ok: false; error: string };
  /* GISTEMP only: live file or bundled snapshot. */
  origin?: DataOrigin;
}

type Load<T> = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; data: T };

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const r = await fetch(url, { signal });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((body as { error?: string }).error ?? `The service answered ${r.status}`);
  return body as T;
}

export function useLoad<T>(url: string | null): Load<T> {
  const [state, setState] = useState<Load<T>>({ status: "loading" });
  useEffect(() => {
    if (!url) return;
    const c = new AbortController();
    setState({ status: "loading" });
    getJson<T>(url, c.signal)
      .then((data) => setState({ status: "ready", data }))
      .catch((e: Error) => {
        if (e.name !== "AbortError") setState({ status: "error", error: e.message || "The service did not respond" });
      });
    return () => c.abort();
  }, [url]);
  return state;
}

export function useReportData(p: ReportParams) {
  const q = `start=${p.from}&end=${p.to}&season=${p.season}`;
  const cityFrom = Math.max(POWER_START, p.from);
  const cq = `start=${cityFrom}&end=${p.to}&season=${p.season}&variable=${p.variable}`;
  const mainUrl = !p.valid
    ? null
    : p.global
      ? `/api/global?${q}`
      : `/api/report?lat=${p.lat.toFixed(4)}&lon=${p.lon.toFixed(4)}&name=${encodeURIComponent(p.name)}&${q}&variable=${p.variable}`;
  const main = useLoad<MainData>(mainUrl);
  /* GISTEMP is temperature: the planet comparison only appears for temperature. */
  const planet = useLoad<MainData>(p.valid && !p.global && p.variable === "T2M" ? `/api/global?${q}` : null);
  const compare = useLoad<CompareRow[]>(p.valid && p.to - cityFrom + 1 >= 10 ? `/api/compare?${cq}` : null);
  return { main, planet, compare };
}

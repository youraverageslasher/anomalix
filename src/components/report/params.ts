"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Season } from "@/lib/data/types";
import { POWER_END, POWER_START } from "@/lib/data/power";
import { GISTEMP_FIRST_REQUEST } from "@/lib/data/gistemp";
import { DEFAULT_VARIABLE, readVariable, type VariableCode } from "@/lib/data/variables";

export const SEASONS: { id: Season; label: string }[] = [
  { id: "ALL", label: "All year" },
  { id: "DJF", label: "DJF · Dec to Feb" },
  { id: "MAM", label: "MAM · Mar to May" },
  { id: "JJA", label: "JJA · Jun to Aug" },
  { id: "SON", label: "SON · Sep to Nov" },
];

/* Request bounds for the period pickers. The years a report shows are always computed from the data. */
export const CITY_MIN = POWER_START;
export const GLOBAL_MIN = GISTEMP_FIRST_REQUEST;
export const MAX_YEAR = POWER_END;
export const MIN_SPAN = 10;

export interface ReportParams {
  /* Variable asked for in the URL; `variable` is what is analyzed (Global is temperature only). */
  requestedVariable: VariableCode;
  variable: VariableCode;
  global: boolean;
  lat: number;
  lon: number;
  name: string;
  cityName: string;
  from: number;
  to: number;
  season: Season;
  valid: boolean;
  cc: string | null;
  admin1: string | null;
}

export function useReportParams(): [ReportParams, (patch: Partial<ReportParams>) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const params = useMemo<ReportParams>(() => {
    const global = sp.get("region") === "global";
    const lat = Number(sp.get("lat"));
    const lon = Number(sp.get("lon"));
    const min = global ? GLOBAL_MIN : CITY_MIN;
    let from = Number(sp.get("from") ?? CITY_MIN);
    let to = Number(sp.get("to") ?? MAX_YEAR);
    if (!Number.isInteger(from) || from < min || from > MAX_YEAR) from = CITY_MIN;
    if (!Number.isInteger(to) || to < min || to > MAX_YEAR) to = MAX_YEAR;
    if (to - from + 1 < MIN_SPAN) {
      from = CITY_MIN;
      to = MAX_YEAR;
    }
    const s = (sp.get("season") ?? "ALL").toUpperCase() as Season;
    const season = SEASONS.some((x) => x.id === s) ? s : "ALL";
    const valid =
      global || (sp.get("lat") !== null && sp.get("lon") !== null && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180);
    const cityName = (sp.get("name") ?? sp.get("nome") ?? "").trim().slice(0, 80);
    const name = global ? "Global" : cityName;
    const cc = sp.get("cc");
    const admin1 = sp.get("admin1");
    const requestedVariable = readVariable(sp.get("variable"));
    const variable = global ? DEFAULT_VARIABLE : requestedVariable;
    return { global, lat, lon, name, cityName, from, to, season, valid, cc, admin1, requestedVariable, variable };
  }, [sp]);

  const update = useCallback(
    (patch: Partial<ReportParams>) => {
      const next = { ...params, ...patch };
      const q = new URLSearchParams();
      if (next.global) q.set("region", "global");
      if (Number.isFinite(next.lat) && Number.isFinite(next.lon)) {
        q.set("lat", next.lat.toFixed(4));
        q.set("lon", next.lon.toFixed(4));
        if (next.cityName) q.set("name", next.cityName);
        if (next.cc) q.set("cc", next.cc);
        if (next.admin1) q.set("admin1", next.admin1);
      }
      const min = next.global ? GLOBAL_MIN : CITY_MIN;
      q.set("from", String(Math.max(min, next.from)));
      q.set("to", String(next.to));
      q.set("season", next.season);
      const v = patch.variable ?? next.requestedVariable;
      if (v !== DEFAULT_VARIABLE) q.set("variable", v);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  return [params, update];
}

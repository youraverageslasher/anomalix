"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { highlightOf, locate, placeLine, type Highlight, type Located } from "@/lib/data/locate";

export interface SearchedPlace {
  name: string;
  lat: number;
  lon: number;
  cc: string | null;
  admin1: string | null;
}

export interface SearchState {
  place: SearchedPlace | null;
  loc: Located | null;
  highlight: Highlight | null;
  foreign: boolean;
  line: string | null;
}

export function resolveSearch(place: SearchedPlace | null): SearchState {
  if (!place) return { place: null, loc: null, highlight: null, foreign: false, line: null };
  const loc = locate({ lat: place.lat, lon: place.lon, countryCode: place.cc, admin1: place.admin1 });
  return { place, loc, highlight: highlightOf(loc), foreign: loc.kind === "foreign", line: placeLine(place.name, loc) };
}

/* Reads the searched place from the URL. Global searches and pages without a place return no place, so nothing is highlighted. */
export function useSearchedPlace(): SearchState {
  const sp = useSearchParams();
  const key = sp.toString();
  return useMemo(() => {
    if (sp.get("region") === "global" || sp.get("lat") === null || sp.get("lon") === null) return resolveSearch(null);
    const lat = Number(sp.get("lat"));
    const lon = Number(sp.get("lon"));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return resolveSearch(null);
    return resolveSearch({ name: (sp.get("name") ?? "This place").slice(0, 80), lat, lon, cc: sp.get("cc"), admin1: sp.get("admin1") });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

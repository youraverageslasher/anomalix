"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { geocode } from "@/components/ui/SearchPill";
import { reportHref, type Place } from "@/lib/geo";
import { stateByAdmin1 } from "@/lib/data/locate";
import { signed } from "@/lib/data/fmt";
import type { Verdict } from "@/lib/data/verdict";
import grid from "../../../public/data/brazil-grid.json";

/* Only the names are fixed; coordinates come from the app's own Open-Meteo geocoding, numbers and tags from live data. */
const CASES: { query: string; cc: string; admin1?: string; why: string }[] = [
  { query: "São José do Rio Preto", cc: "BR", admin1: "São Paulo", why: "Inland Brazil" },
  { query: "Palmas", cc: "BR", admin1: "Tocantins", why: "Brazil's center north" },
  { query: "Delhi", cc: "IN", why: "A megacity" },
  { query: "Longyearbyen", cc: "SJ", why: "The high Arctic" },
];

const norm = (s?: string) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const FASTEST_STATE = [...grid.states].sort((a, b) => b.value - a.value)[0]?.sigla ?? null;

type Live = { place: Place; perDecade: number; verdict: Verdict } | { place: Place; perDecade: null; verdict: null } | null;

async function resolve(c: (typeof CASES)[number], signal: AbortSignal): Promise<Live> {
  const hits = await geocode(c.query, signal, 10);
  const place = hits.find((h) => h.cc === c.cc && (!c.admin1 || norm(h.admin1) === norm(c.admin1)));
  if (!place) return null;
  const q = new URLSearchParams({ lat: place.lat.toFixed(4), lon: place.lon.toFixed(4), name: place.nome, season: "ALL", extras: "0" });
  try {
    const r = await fetch(`/api/report?${q}`, { signal });
    if (!r.ok) return { place, perDecade: null, verdict: null };
    const d = (await r.json()) as { analysis: { trend: { perDecade: number } }; verdict: Verdict };
    return { place, perDecade: d.analysis.trend.perDecade, verdict: d.verdict };
  } catch {
    return { place, perDecade: null, verdict: null };
  }
}

function tagFor(live: Live): string | null {
  if (!live || !live.verdict) return null;
  if (live.verdict.confidence === "Inconclusive") return "Honesty case";
  const sigla = live.place.cc === "BR" ? stateByAdmin1(live.place.admin1)?.properties.sigla : null;
  if (sigla && sigla === FASTEST_STATE) return "Fastest state in Brazil";
  return null;
}

export function CaseCards() {
  const [live, setLive] = useState<(Live | undefined)[]>(CASES.map(() => undefined));
  useEffect(() => {
    const c = new AbortController();
    CASES.forEach((k, i) =>
      resolve(k, c.signal)
        .then((r) => setLive((prev) => prev.map((v, j) => (j === i ? r : v))))
        .catch(() => setLive((prev) => prev.map((v, j) => (j === i ? null : v)))),
    );
    return () => c.abort();
  }, []);

  return (
    <ul aria-label="Four cases to start with" className="mt-6 grid w-full max-w-[880px] grid-cols-2 gap-3 md:grid-cols-4">
      {CASES.map((k, i) => {
        const l = live[i];
        const tag = tagFor(l ?? null);
        const value =
          l === undefined ? "Loading" : l === null ? "Not found" : l.perDecade === null ? "NASA POWER did not answer" : `${signed(l.perDecade)} °C per decade`;
        const body = (
          <>
            <span className="block text-[12px] text-muted">{k.why}</span>
            <span className="mt-2 block break-words font-serif text-[18px] leading-tight text-text sm:text-[20px]">{k.query}</span>
            <span className="mt-1 block text-[13px] text-body tnum">{value}</span>
            {tag && (
              <span
                className={`mt-2 inline-block whitespace-nowrap rounded-full border px-2 py-[2px] text-[11px] font-semibold ${tag === "Honesty case" ? "border-dashed border-highlight-border text-body" : "border-signal/60 text-text"}`}
              >
                {tag}
              </span>
            )}
          </>
        );
        return (
          <li key={k.query}>
            {l ? (
              <Link
                href={reportHref(l.place)}
                aria-label={`Open the report for ${l.place.nome}: ${value}${tag ? `, ${tag}` : ""}`}
                className="case-card card-hover block h-full rounded-card-sm border border-rule bg-card p-4 text-left transition-colors hover:border-highlight-border hover:bg-highlight focus:outline-none focus-visible:ring-2 focus-visible:ring-text/70"
              >
                {body}
              </Link>
            ) : (
              <div aria-busy={l === undefined} className="block h-full rounded-card-sm border border-rule bg-card p-4 text-left opacity-80">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

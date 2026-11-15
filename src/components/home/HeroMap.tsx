"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DotMap, worldProjection, type MapMarker } from "@/components/v6/DotMap";
import { CityCard, HighlightCard, type CityCardData } from "@/components/v6/CityCard";
import { EXAMPLE_CITIES } from "@/lib/data/cities";
import { reportHref } from "@/lib/geo";
import type { CompareRow } from "@/lib/data/compare-types";
import { useCompare } from "./useCompare";

const FULL_W = 1312;
const FULL_H = 640;
const SJRP = "São José do Rio Preto";

const CARDS: { name: string; dx: number; dy: number; highlight?: boolean; onlyIfInconclusive?: boolean }[] = [
  { name: "London", dx: 22, dy: -132 },
  { name: "Delhi", dx: 24, dy: -200, onlyIfInconclusive: true },
  { name: "New York", dx: -222, dy: -60 },
  { name: "Nairobi", dx: 24, dy: 24 },
  { name: "Tokyo", dx: -100, dy: 32 },
  { name: SJRP, dx: -276, dy: -18, highlight: true },
];

function toCard(row: Extract<CompareRow, { ok: true }>): CityCardData {
  return {
    name: row.place.name,
    country: row.place.country ?? "",
    perDecade: row.perDecade,
    ci95: row.ci95,
    p: row.p,
    inconclusive: row.verdict.confidence === "Inconclusive",
    direction: row.verdict.direction,
    anomalies: row.anomalies,
  };
}

function href(name: string) {
  const c = EXAMPLE_CITIES.find((x) => x.name === name)!;
  return reportHref({ nome: name === SJRP ? `${SJRP}, SP` : name, lat: c.lat, lon: c.lon });
}

function Skeleton({ wide }: { wide?: boolean }) {
  return (
    <div className={`${wide ? "w-[214px]" : "w-[196px]"} animate-pulse rounded-card-sm border border-rule bg-card p-[14px] shadow-float`} aria-hidden>
      <div className="h-3 w-24 rounded bg-track" />
      <div className="mt-2 h-2 w-14 rounded bg-track" />
      <div className="mt-4 h-7 w-28 rounded bg-track" />
      <div className="mt-3 h-[14px] w-full rounded bg-track" />
    </div>
  );
}

export function HeroMap({ stateValues }: { stateValues: Record<string, number> }) {
  const data = useCompare();
  const box = useRef<HTMLDivElement>(null);
  const [cw, setCw] = useState(FULL_W);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const small = cw < 1024;
  const W = small ? FULL_W / 2 : FULL_W;
  const H = small ? FULL_H / 2 : FULL_H;
  const k = Math.min(small ? 2 : 1, cw / W);
  const projection = useMemo(() => worldProjection(W, H), [W, H]);
  const rows = data.status === "ready" ? data.rows : [];
  const ok = (name: string) => {
    const r = rows.find((x) => x.place.name === name);
    return r && r.ok ? r : null;
  };

  const markers: MapMarker[] = EXAMPLE_CITIES.map((c) => {
    const r = ok(c.name);
    const inconclusive = r?.verdict.confidence === "Inconclusive";
    return {
      id: c.name,
      lat: c.lat,
      lon: c.lon,
      tone: inconclusive ? "inconclusive" : "default",
      label: c.name === "Sydney" || c.name === "Manaus" ? c.name : undefined,
    };
  });

  const sj = EXAMPLE_CITIES.find((c) => c.name === SJRP)!;
  const ldn = EXAMPLE_CITIES.find((c) => c.name === "London")!;
  const nbo = EXAMPLE_CITIES.find((c) => c.name === "Nairobi")!;
  const arcs = [
    { from: [sj.lon, sj.lat] as [number, number], to: [ldn.lon, ldn.lat] as [number, number] },
    { from: [sj.lon, sj.lat] as [number, number], to: [nbo.lon, nbo.lat] as [number, number] },
  ];

  const floating = (small ? [] : CARDS).map((c) => {
    const city = EXAMPLE_CITIES.find((x) => x.name === c.name)!;
    const p = projection([city.lon, city.lat])!;
    const row = ok(c.name);
    if (data.status === "ready" && !row) return null;
    if (row && c.onlyIfInconclusive && !(row.p >= 0.05)) return null;
    return { ...c, x: p[0] + c.dx, y: p[1] + c.dy, row };
  }).filter(Boolean) as ((typeof CARDS)[number] & { x: number; y: number; row: ReturnType<typeof ok> })[];

  const failed = data.status === "ready" ? rows.filter((r) => !r.ok).map((r) => r.place.name) : [];

  return (
    <section aria-label="Example cities on a world map" className="mx-auto w-full max-w-canvas px-5 md:px-side-map">
      <div ref={box} className="relative w-full" style={{ height: H * k }}>
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: H, transform: `scale(${k})` }}>
          <DotMap width={W} height={H} markers={markers} arcs={arcs} stateValues={stateValues} />
          <div className="hidden lg:block">
            {floating.map((c) => (
              <div key={c.name} className="absolute" style={{ left: c.x, top: c.y }}>
                {c.row ? (
                  <Link href={href(c.name)} aria-label={`Open the report for ${c.name}`} className="block rounded-card-sm focus-visible:outline-offset-4">
                    {c.highlight ? <HighlightCard data={toCard(c.row)} badge="SP" /> : <CityCard data={toCard(c.row)} />}
                  </Link>
                ) : (
                  <Skeleton wide={c.highlight} />
                )}
              </div>
            ))}
          </div>
          {EXAMPLE_CITIES.map((c) => {
            const p = projection([c.lon, c.lat])!;
            return (
              <Link
                key={c.name}
                href={href(c.name)}
                aria-label={`Open the report for ${c.name}`}
                className="absolute h-[28px] w-[28px] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: p[0], top: p[1] }}
              />
            );
          })}
        </div>
      </div>

      {data.status === "error" && (
        <p role="alert" className="mt-4 text-center text-[14px] text-body">
          {data.error} The example cities could not be loaded right now, so no numbers are shown. Try reloading the page.
        </p>
      )}
      {failed.length > 0 && (
        <p role="status" className="mt-4 text-center text-[13px] text-muted">
          NASA POWER did not answer for {failed.join(", ")}. Those cities are left out instead of guessed.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
        {CARDS.map((c) => {
          const row = ok(c.name);
          if (data.status === "ready" && !row) return null;
          if (row && c.onlyIfInconclusive && !(row.p >= 0.05)) return null;
          return (
            <div key={c.name} className="flex justify-center">
              {row ? (
                <Link href={href(c.name)} aria-label={`Open the report for ${c.name}`}>
                  {c.highlight ? <HighlightCard data={toCard(row)} badge="SP" /> : <CityCard data={toCard(row)} />}
                </Link>
              ) : (
                <Skeleton wide={c.highlight} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

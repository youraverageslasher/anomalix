"use client";

import { useEffect, useMemo, useState } from "react";
import { geoCentroid, geoPath } from "d3-geo";
import { brazilRegion, brazilStates } from "@/components/v6/geo";
import { Marker } from "@/components/v6/Marker";
import type { Highlight } from "@/lib/data/locate";
import { useInView } from "@/components/v6/motion";
import { MAP_H, MAP_W, labelFor, mapProjection, type LabelSpot } from "./labels";

let labelCache: Record<RegionId, LabelSpot> | null = null;
function allLabels(projection: ReturnType<typeof mapProjection>) {
  labelCache ??= Object.fromEntries((Object.keys(REGIONS) as RegionId[]).map((id) => [id, labelFor(id, projection)])) as Record<RegionId, LabelSpot>;
  return labelCache;
}
import { colorFor } from "@/lib/data/color";
import { REGIONS, type RegionId } from "@/lib/data/brazil";
import { signed } from "@/lib/data/fmt";

const W = MAP_W;
const H = MAP_H;

export function StatesMap({
  values,
  regionMeans,
  active,
  onActive,
  activeRegion,
  place,
  highlight,
  compact = false,
}: {
  values: Record<string, number>;
  regionMeans: Record<RegionId, number>;
  active: string | null;
  onActive: (sigla: string | null) => void;
  activeRegion: RegionId | null;
  place: { name: string; lat: number; lon: number } | null;
  highlight: Highlight | null;
  compact?: boolean;
}) {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: "0px 0px -10% 0px" });
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);

  const geo = useMemo(() => {
    const projection = mapProjection();
    const path = geoPath(projection);
    const states = brazilStates()
      .map((f) => ({ sigla: f.properties.sigla, nome: f.properties.nome, d: path(f) ?? "", cx: projection(geoCentroid(f))?.[0] ?? 0 }))
      .sort((a, b) => a.cx - b.cx)
      .map((s, i) => ({ ...s, order: i }));
    const regions = (Object.keys(REGIONS) as RegionId[]).map((id) => ({ id, d: path(brazilRegion(id)) ?? "" }));
    return { projection, states, regions };
  }, []);

  const [labels, setLabels] = useState<Record<RegionId, LabelSpot> | null>(labelCache);
  useEffect(() => {
    if (compact || labels) return;
    const id = window.setTimeout(() => setLabels(allLabels(geo.projection)), 60);
    return () => window.clearTimeout(id);
  }, [compact, labels, geo.projection]);

  const mark = place && highlight ? geo.projection([place.lon, place.lat]) : null;
  const avoidKey = mark && highlight ? `${highlight.region}:${mark[0].toFixed(0)}:${mark[1].toFixed(0)}` : null;
  const [moved, setMoved] = useState<{ key: string; spot: LabelSpot } | null>(null);
  useEffect(() => {
    if (compact || !avoidKey || !highlight || !mark) return;
    const id = window.setTimeout(() => setMoved({ key: avoidKey, spot: labelFor(highlight.region, geo.projection, { avoid: { x: mark[0], y: mark[1], r: 20 } }) }), 80);
    return () => window.clearTimeout(id);
  }, [avoidKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const spotFor = (id: RegionId): LabelSpot | null => {
    if (!labels) return null;
    if (highlight && id === highlight.region && avoidKey) return moved?.key === avoidKey ? moved.spot : null;
    return labels[id];
  };
  const shownRegion = activeRegion ?? highlight?.region ?? null;
  const placeState = highlight?.sigla ?? null;
  const focusSigla = active ?? null;
  const isDim = (sigla: string) => (activeRegion ? !REGIONS[activeRegion].states.includes(sigla) : !!highlight && sigla !== highlight.sigla);
  const markerSide = (() => {
    if (!mark || !labels || !place || !highlight) return null;
    const lw = place.name.split(",")[0].length * 7.1 + 18;
    const hits = (side: "right" | "left") => {
      const x0 = side === "right" ? mark[0] + 16 : mark[0] - 16 - lw;
      if (x0 < 0 || x0 + lw > W) return true;
      return (Object.keys(labels) as RegionId[]).map(spotFor).filter((l): l is LabelSpot => !!l).some((l) => {
        const hw = (l.w * l.scale) / 2;
        const hh = (l.h * l.scale) / 2;
        return x0 < l.x + hw && x0 + lw > l.x - hw && mark[1] - 12 < l.y + hh && mark[1] + 12 > l.y - hh;
      });
    };
    const pref = mark[0] > W * 0.62 ? "left" : "right";
    const alt = pref === "left" ? "right" : "left";
    return !hits(pref) ? pref : !hits(alt) ? alt : null;
  })();
  const tipState = focusSigla ? geo.states.find((s) => s.sigla === focusSigla) : null;

  return (
    <div ref={ref} className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Map of Brazil shaded by each state's warming rate, with region means" onMouseLeave={() => { onActive(null); setTip(null); }}>
        <g className={inView ? "map-in" : "map-wait"}>
          {geo.states.map((s) => {
            const v = values[s.sigla];
            const isActive = s.sigla === focusSigla || s.sigla === placeState;
            return (
              <path
                key={s.sigla}
                d={s.d}
                className={`state-shape st-fade hl-anim ${isDim(s.sigla) ? "hl-dim" : ""}`}
                style={{ animationDelay: `${s.order * 55}ms` }}
                fill={Number.isFinite(v) ? colorFor(v) : "#323A46"}
                stroke="#0D1015"
                strokeWidth={isActive ? 0 : 0.8}
                tabIndex={0}
                aria-label={`${s.nome} (${s.sigla}): ${Number.isFinite(v) ? signed(v) : "no data"} °C per decade`}
                onMouseEnter={() => onActive(s.sigla)}
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setTip({ x: e.clientX - box.left, y: e.clientY - box.top });
                }}
                onFocus={(e) => {
                  const b = (e.currentTarget as SVGPathElement).getBBox();
                  const k = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect().width / W;
                  onActive(s.sigla);
                  setTip({ x: (b.x + b.width / 2) * k, y: (b.y + b.height / 2) * k });
                }}
                onBlur={() => onActive(null)}
              />
            );
          })}
        </g>
        <g fill="none" stroke="#ECEEF1" strokeOpacity={0.6} strokeWidth={1} strokeLinejoin="round" pointerEvents="none">
          {geo.regions.map((r) => (
            <path key={r.id} d={r.d} className="hl-anim" strokeOpacity={shownRegion === r.id ? 1 : shownRegion ? 0.35 : 0.6} strokeWidth={shownRegion === r.id ? 1.6 : 1} />
          ))}
        </g>
        <g fill="none" stroke="#ECEEF1" strokeWidth={2} pointerEvents="none">
          {geo.states
            .filter((s) => s.sigla === focusSigla || s.sigla === placeState)
            .map((s) => (
              <path key={s.sigla} d={s.d} />
            ))}
        </g>
        <g className={compact ? "hidden" : "region-labels hidden sm:inline"} pointerEvents="none">
          {labels && geo.regions.map((r) => {
            const spot = spotFor(r.id);
            if (!spot) return null;
            const { x, y, scale, w, h } = spot;
            const on = shownRegion === r.id;
            const dim = !!shownRegion && !on;
            return (
              <g key={r.id} transform={`translate(${x} ${y}) scale(${scale})`} opacity={dim ? 0.45 : 1} className="region-label label-pop">
                <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={10} fill={on ? "#ECEEF1" : "#0D1015"} fillOpacity={on ? 1 : 0.92} stroke="#ECEEF1" strokeOpacity={on ? 1 : 0.5} className="hl-anim" />
                <text y={-h * 0.12} textAnchor="middle" fontSize={h * 0.225} fill={on ? "#262E3A" : "#B3BBC7"} style={{ fontFamily: "var(--font-sans)" }}>
                  {REGIONS[r.id].name}
                </text>
                <text y={h * 0.33} textAnchor="middle" fontSize={h * 0.415} fill={on ? "#0D1015" : "#ECEEF1"} style={{ fontFamily: "var(--font-serif)", fontVariantNumeric: "tabular-nums" }}>
                  {signed(regionMeans[r.id])}
                </text>
              </g>
            );
          })}
        </g>
        {mark && place && placeState && (
          <Marker x={mark[0]} y={mark[1]} tone="searched" title={place.name} label={!compact && markerSide ? place.name.split(",")[0] : undefined} labelSide={markerSide ?? "right"} />
        )}
      </svg>
      {tipState && tip && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+16px)] whitespace-nowrap rounded-card-sm border border-highlight-border bg-highlight px-4 py-3 shadow-float"
          style={{ left: tip.x, top: tip.y }}
        >
          <p className="text-[13px] font-semibold text-text">
            {tipState.nome} <span className="ml-1 text-muted">{tipState.sigla}</span>
          </p>
          <p className="mt-1 font-serif text-[26px] leading-none text-text tnum">
            {signed(values[tipState.sigla])}
            <span className="ml-1 font-sans text-[12px] text-muted">°C/decade</span>
          </p>
        </div>
      )}
    </div>
  );
}

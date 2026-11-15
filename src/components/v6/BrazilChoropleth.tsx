"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoCentroid, geoMercator, geoPath } from "d3-geo";
import { brazilOutline, brazilRegion, brazilStates } from "./geo";
import { RegionLabel } from "./RegionLabel";
import { Marker } from "./Marker";
import type { Highlight } from "@/lib/data/locate";
import { placeLabel } from "@/components/states/labels";

const TAG_W = 108;
const TAG_H = 58;
import { colorFor } from "@/lib/data/color";
import { REGIONS, type RegionId } from "@/lib/data/brazil";
import { signed } from "@/lib/data/fmt";

const NUDGE: Record<RegionId, [number, number]> = {
  N: [0, 0],
  NE: [-0.035, 0],
  CW: [0, 0],
  SE: [-0.05, 0],
  S: [0.05, -0.012],
};

export interface RegionDatum {
  id: RegionId;
  value: number;
}

export function BrazilChoropleth({
  width,
  stateValues,
  regions,
  variant = "default",
  marker = null,
  markerLabel,
  highlight = null,
}: {
  width: number;
  stateValues: Record<string, number>;
  regions?: RegionDatum[];
  variant?: "default" | "hairline";
  marker?: [number, number] | null;
  markerLabel?: string;
  highlight?: Highlight | null;
}) {
  const height = Math.round(width * 1.0);
  const [hover, setHover] = useState<{ sigla: string; x: number; y: number } | null>(null);

  const geo = useMemo(() => {
    const projection = geoMercator().fitExtent(
      [
        [8, 8],
        [width - 8, height - 8],
      ],
      brazilOutline(),
    );
    const path = geoPath(projection);
    const states = brazilStates().map((f) => ({ f, d: path(f) ?? "", sigla: f.properties.sigla, nome: f.properties.nome }));
    const regionPaths = (Object.keys(REGIONS) as RegionId[]).map((id) => {
      const feat = brazilRegion(id);
      const c = projection(geoCentroid(feat));
      return { id, d: path(feat) ?? "", centroid: c ? ([c[0] + NUDGE[id][0] * width, c[1] + NUDGE[id][1] * height] as [number, number]) : null };
    });
    const m = marker ? projection(marker) : null;
    return { states, regionPaths, m };
  }, [width, height, marker]);

  /* The highlighted region's label moves off the marker when they would collide; every other label keeps its place. */
  const tagSpots = useMemo(() => {
    const spots = new Map<RegionId, [number, number, number]>();
    for (const r of geo.regionPaths) if (r.centroid) spots.set(r.id, [r.centroid[0], r.centroid[1], 1]);
    if (highlight && geo.m) {
      const c = spots.get(highlight.region);
      const [mx, my] = geo.m;
      const r = 24;
      const hit = c && Math.max(Math.abs(mx - c[0]) - TAG_W / 2, 0) ** 2 + Math.max(Math.abs(my - c[1]) - TAG_H / 2, 0) ** 2 <= r * r;
      if (hit) {
        const projection = geoMercator().fitExtent([[8, 8], [width - 8, height - 8]], brazilOutline());
        const spot = placeLabel(highlight.region, projection, TAG_W, TAG_H, { avoid: { x: mx, y: my, r }, width, height });
        if (spot.fit >= 0.7) spots.set(highlight.region, [spot.x, spot.y, Math.min(1, spot.fit)]);
      }
    }
    return spots;
  }, [geo, highlight, width, height]);
  const markerSide = (() => {
    if (!geo.m || !markerLabel) return null;
    const [mx, my] = geo.m;
    const lw = markerLabel.split(",")[0].length * 7.1 + 18;
    const hits = (side: "right" | "left") => {
      const x0 = side === "right" ? mx + 16 : mx - 16 - lw;
      if (x0 < 0 || x0 + lw > width) return true;
      return !!regions?.some((rg) => {
        const c = tagSpots.get(rg.id);
        return !!c && x0 < c[0] + TAG_W / 2 && x0 + lw > c[0] - TAG_W / 2 && my - 12 < c[1] + TAG_H / 2 && my + 12 > c[1] - TAG_H / 2;
      });
    };
    const pref = mx > width * 0.6 ? "left" : "right";
    const alt = pref === "left" ? "right" : "left";
    return !hits(pref) ? pref : !hits(alt) ? alt : null;
  })();

  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(Math.min(1, el.getBoundingClientRect().width / width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

  const hovered = hover ? geo.states.find((s) => s.sigla === hover.sigla) : null;
  const regionStroke = variant === "hairline" ? "#ECEEF1" : "#0D1015";
  const regionWidth = variant === "hairline" ? 1 : 1.5;

  return (
    <div ref={box} className="relative" style={{ width: "100%", maxWidth: width }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label="Map of Brazil shaded by each state's warming rate"
        onMouseLeave={() => setHover(null)}
      >
        <g>
          {geo.states.map((s) => {
            const v = stateValues[s.sigla];
            return (
              <path
                key={s.sigla}
                d={s.d}
                className={`state-shape hl-anim ${highlight && highlight.sigla !== s.sigla ? "hl-dim" : ""}`}
                fill={Number.isFinite(v) ? colorFor(v) : "#323A46"}
                stroke="#0D1015"
                strokeWidth={0.6}
                tabIndex={0}
                aria-label={`${s.nome} (${s.sigla}): ${Number.isFinite(v) ? signed(v) : "no data"} °C per decade`}
                onMouseMove={(e) => {
                  const box = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({ sigla: s.sigla, x: e.clientX - box.left, y: e.clientY - box.top });
                }}
                onFocus={(e) => {
                  const b = (e.currentTarget as SVGPathElement).getBBox();
                  const k = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect().width / width;
                  setHover({ sigla: s.sigla, x: (b.x + b.width / 2) * k, y: (b.y + b.height / 2) * k });
                }}
                onBlur={() => setHover(null)}
              />
            );
          })}
        </g>
        <g fill="none" stroke={regionStroke} strokeWidth={regionWidth} strokeLinejoin="round" pointerEvents="none">
          {geo.regionPaths.map((r) => (
            <path key={r.id} d={r.d} />
          ))}
        </g>
        {highlight && (
          <g fill="none" stroke="#ECEEF1" strokeLinejoin="round" pointerEvents="none">
            {geo.regionPaths
              .filter((r) => r.id === highlight.region)
              .map((r) => (
                <path key={r.id} d={r.d} strokeWidth={1.4} strokeOpacity={0.9} className="hl-anim" />
              ))}
            {geo.states
              .filter((s) => s.sigla === highlight.sigla)
              .map((s) => (
                <path key={s.sigla} d={s.d} strokeWidth={2} className="hl-anim" />
              ))}
          </g>
        )}
      </svg>

      {regions?.map((r) => {
        const spot = tagSpots.get(r.id);
        if (!spot) return null;
        const isOn = highlight?.region === r.id;
        /* On narrow screens the labels would shrink below a readable size: keep only the searched region's label there. */
        if (k < 0.8 && !isOn) return null;
        return (
          <RegionLabel
            key={r.id}
            x={`${(spot[0] / width) * 100}%`}
            y={`${(spot[1] / height) * 100}%`}
            name={REGIONS[r.id].name}
            value={signed(r.value)}
            tone={!highlight ? "default" : highlight.region === r.id ? "on" : "off"}
            scale={k < 0.8 ? Math.max(0.85, k) * spot[2] : k * spot[2]}
          />
        );
      })}

      {geo.m && (
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" className="pointer-events-none absolute inset-0" aria-hidden>
          <Marker x={geo.m[0]} y={geo.m[1]} tone="searched" label={markerSide ? markerLabel?.split(",")[0] : undefined} labelSide={markerSide ?? "right"} title={markerLabel} />
        </svg>
      )}

      {hovered && hover && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+14px)] whitespace-nowrap rounded-card-sm border border-highlight-border bg-highlight px-3 py-2 shadow-float"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="text-[13px] font-semibold text-text">
            {hovered.nome} <span className="text-muted">{hovered.sigla}</span>
          </div>
          <div className="font-serif text-[20px] text-text tnum">
            {Number.isFinite(stateValues[hovered.sigla]) ? signed(stateValues[hovered.sigla]) : "no data"}
            <span className="ml-1 font-sans text-[12px] text-muted">°C/decade</span>
          </div>
        </div>
      )}
    </div>
  );
}

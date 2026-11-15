"use client";

import { useMemo } from "react";
import { geoInterpolate, geoNaturalEarth1, geoPath } from "d3-geo";
import { brazilRegion, brazilStateAt, brazilStates, isLand, worldLand } from "./geo";
import type { Highlight } from "@/lib/data/locate";
import { Marker, type MarkerTone } from "./Marker";
import { colorFor } from "@/lib/data/color";

export interface MapMarker {
  id: string;
  lat: number;
  lon: number;
  tone?: MarkerTone;
  label?: string;
  labelSide?: "right" | "left";
}

export interface MapArc {
  from: [number, number];
  to: [number, number];
}

const GAP = 9;
const R = 3.35;
const DARK = "#323A46";

export function arcPath(path: ReturnType<typeof geoPath>, a: MapArc): string {
  const interp = geoInterpolate(a.from, a.to);
  const coords = Array.from({ length: 65 }, (_, i) => interp(i / 64));
  return path({ type: "LineString", coordinates: coords }) ?? "";
}

export function worldProjection(width: number, height: number) {
  return geoNaturalEarth1().fitExtent(
    [
      [4, 4],
      [width - 4, height - 4],
    ],
    worldLand(),
  );
}

export function DotMap({
  width,
  height,
  markers = [],
  arcs = [],
  stateValues = {},
  highlight = null,
  neutralBrazil = false,
  className = "",
  ariaLabel = "World map drawn in dots, with Brazil shaded by state",
}: {
  width: number;
  height?: number;
  markers?: MapMarker[];
  arcs?: MapArc[];
  stateValues?: Record<string, number>;
  highlight?: Highlight | null;
  neutralBrazil?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const geo = useMemo(() => {
    const h0 = height ?? Math.round(width * 0.5);
    const projection = worldProjection(width, h0);
    const path = geoPath(projection);
    const dots: { x: number; y: number; fill: string; r: number; sigla: string | null }[] = [];
    for (let row = 0, y = GAP / 2; y < h0; row++, y += GAP * 0.866) {
      for (let x = (row % 2 ? GAP : GAP / 2); x < width; x += GAP) {
        const ll = projection.invert?.([x, y]);
        if (!ll || !Number.isFinite(ll[0])) continue;
        if (!isLand(ll[0], ll[1])) continue;
        let fill = DARK;
        let r = R;
        const sigla = brazilStateAt(ll[0], ll[1]);
        if (sigla && !neutralBrazil) {
          const v = stateValues[sigla];
          if (Number.isFinite(v)) {
            fill = colorFor(v);
            r = R * 1.12;
          }
        }
        dots.push({ x, y, fill, r, sigla });
      }
    }
    return { projection, path, dots, h: h0 };
  }, [width, height, stateValues, neutralBrazil]);

  const outline = useMemo(() => {
    if (!highlight) return null;
    const state = brazilStates().find((f) => f.properties.sigla === highlight.sigla);
    return { region: geo.path(brazilRegion(highlight.region)) ?? "", state: state ? geo.path(state) ?? "" : "" };
  }, [highlight, geo]);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${geo.h}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <g>
        {geo.dots.map((d, i) => (
          <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r} fill={d.fill} className={d.sigla ? `hl-anim ${highlight && d.sigla !== highlight.sigla ? "hl-dim" : ""}` : undefined} />
        ))}
      </g>
      {outline && (
        <g fill="none" stroke="#ECEEF1" strokeLinejoin="round" pointerEvents="none">
          <path d={outline.region} strokeWidth={1} strokeOpacity={0.7} className="hl-anim" />
          <path d={outline.state} strokeWidth={2} className="hl-anim" />
        </g>
      )}
      <g fill="none" stroke="#ECEEF1" strokeWidth={1.6} strokeDasharray="2 6" strokeLinecap="round">
        {arcs.map((a, i) => (
          <path key={i} d={arcPath(geo.path, a)} />
        ))}
      </g>
      <g>
        {markers.map((m) => {
          const p = geo.projection([m.lon, m.lat]);
          return p ? <Marker key={m.id} x={p[0]} y={p[1]} tone={m.tone} label={m.label} labelSide={m.labelSide} title={m.label ?? m.id} /> : null;
        })}
      </g>
    </svg>
  );
}

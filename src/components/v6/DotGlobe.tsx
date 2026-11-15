"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { brazilRegion, brazilStateAt, brazilStates, isLand } from "./geo";
import type { Highlight } from "@/lib/data/locate";
import { markerColor, type MarkerTone } from "./Marker";
import { usePrefersReducedMotion } from "./motion";
import { colorFor } from "@/lib/data/color";
import type { MapArc, MapMarker } from "./DotMap";

const GAP = 10.5;
const R_DOT = 3.2;
const DEG = Math.PI / 180;

interface SpherePoint {
  lon: number;
  lat: number;
  sigla: string | null;
}

const pointCache = new Map<string, SpherePoint[]>();

function spherePoints(radius: number): SpherePoint[] {
  const stepDeg = (GAP / radius) / DEG;
  const key = stepDeg.toFixed(3);
  const hit = pointCache.get(key);
  if (hit) return hit;
  const out: SpherePoint[] = [];
  for (let lat = -90 + stepDeg / 2; lat < 90; lat += stepDeg) {
    const n = Math.max(1, Math.round((360 * Math.cos(lat * DEG)) / stepDeg));
    const dlon = 360 / n;
    for (let k = 0; k < n; k++) {
      const lon = -180 + dlon / 2 + k * dlon;
      if (!isLand(lon, lat)) continue;
      out.push({ lon, lat, sigla: brazilStateAt(lon, lat) });
    }
  }
  pointCache.set(key, out);
  return out;
}

export function DotGlobe({
  size,
  focus = [-55, -15],
  markers = [],
  arcs = [],
  stateValues = {},
  rotate = true,
  degreesPerSecond = 3,
  ariaLabel = "Globe drawn in dots, with Brazil shaded by state",
  highlight = null,
  neutralBrazil = false,
  arcDrawMs = 0,
}: {
  size: number;
  focus?: [number, number];
  markers?: MapMarker[];
  arcs?: MapArc[];
  stateValues?: Record<string, number>;
  rotate?: boolean;
  degreesPerSecond?: number;
  ariaLabel?: string;
  highlight?: Highlight | null;
  neutralBrazil?: boolean;
  /* When above zero, arcs draw in once over this many milliseconds; static under reduced motion. */
  arcDrawMs?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const [hover, setHover] = useState(false);
  const lonRef = useRef(focus[0]);
  const latRef = useRef(focus[1]);
  const tween = useRef<{ t0: number; from: [number, number]; to: [number, number] } | null>(null);
  const radius = size / 2 - 2;
  const points = useMemo(() => spherePoints(radius), [radius]);
  const graticule = useMemo(() => geoGraticule10(), []);

  const fLon = focus[0];
  const fLat = focus[1];
  useEffect(() => {
    if (reduced) {
      lonRef.current = fLon;
      latRef.current = fLat;
      tween.current = null;
      return;
    }
    let dLon = ((((fLon - lonRef.current) % 360) + 540) % 360) - 180;
    if (Math.abs(dLon) < 0.01 && Math.abs(fLat - latRef.current) < 0.01) return;
    tween.current = { t0: performance.now(), from: [lonRef.current, latRef.current], to: [lonRef.current + dLon, fLat] };
    dLon = 0;
  }, [fLon, fLat, reduced]);
  const markerKey = markers.map((m) => `${m.id}:${m.lat}:${m.lon}`).join("|");
  const pulseT0 = useRef(0);
  useEffect(() => {
    pulseT0.current = performance.now();
  }, [markerKey]);
  const outlines = useMemo(() => {
    if (!highlight) return null;
    return { state: brazilStates().find((f) => f.properties.sigla === highlight.sigla) ?? null, region: brazilRegion(highlight.region) };
  }, [highlight]);

  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = size / 2;
    const cy = size / 2;
    const proj = geoOrthographic().scale(radius).translate([cx, cy]).clipAngle(90);
    const path = geoPath(proj, ctx);
    const fills = points.map((p) => {
      const v = p.sigla && !neutralBrazil ? stateValues[p.sigla] : NaN;
      return Number.isFinite(v) ? colorFor(v) : null;
    });
    const dim = points.map((p) => !!(highlight && p.sigla && p.sigla !== highlight.sigla));

    const draw = (time: number) => {
      const tw = tween.current;
      if (tw) {
        const k = Math.min(1, (time - tw.t0) / 1200);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        lonRef.current = tw.from[0] + (tw.to[0] - tw.from[0]) * e;
        latRef.current = tw.from[1] + (tw.to[1] - tw.from[1]) * e;
        if (k >= 1) tween.current = null;
      }
      const lam0 = lonRef.current;
      const phi0 = -latRef.current * DEG;
      proj.rotate([-lam0, -latRef.current]);
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#0D1015";
      ctx.fill();
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = "#1E242C";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "#2B323C";
      ctx.stroke();

      const sp0 = Math.sin(-phi0);
      const cp0 = Math.cos(-phi0);
      ctx.fillStyle = "#323A46";
      ctx.beginPath();
      const lit: [number, number, string, number][] = [];
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const lam = (p.lon - lam0) * DEG;
        const phi = p.lat * DEG;
        const cosc = sp0 * Math.sin(phi) + cp0 * Math.cos(phi) * Math.cos(lam);
        if (cosc <= 0.02) continue;
        const x = cx + radius * Math.cos(phi) * Math.sin(lam);
        const y = cy - radius * (cp0 * Math.sin(phi) - sp0 * Math.cos(phi) * Math.cos(lam));
        const f = fills[i];
        if (f) {
          lit.push([x, y, f, dim[i] ? 0.55 : 1]);
          continue;
        }
        const r = R_DOT * (0.55 + 0.45 * cosc);
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fill();
      for (const [x, y, f, a] of lit) {
        ctx.globalAlpha = a;
        ctx.fillStyle = f;
        ctx.beginPath();
        ctx.arc(x, y, R_DOT * 1.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (outlines) {
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(236,238,241,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        path(outlines.region);
        ctx.stroke();
        if (outlines.state) {
          ctx.strokeStyle = "#ECEEF1";
          ctx.lineWidth = 2;
          ctx.beginPath();
          path(outlines.state);
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.setLineDash([2, 6]);
      ctx.lineCap = "round";
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = "#ECEEF1";
      const drawn = reduced || arcDrawMs <= 0 ? 1 : Math.min(1, (time - pulseT0.current) / arcDrawMs);
      for (const a of arcs) {
        const interp = geoInterpolate(a.from, a.to);
        ctx.beginPath();
        path({ type: "LineString", coordinates: Array.from({ length: 65 }, (_, i) => interp((i / 64) * drawn)) });
        ctx.stroke();
      }
      ctx.restore();

      const pk = reduced ? 1 : Math.min(1, (time - pulseT0.current) / 1200);
      for (const m of markers) {
        const lam = (m.lon - lam0) * DEG;
        const phi = m.lat * DEG;
        const cosc = sp0 * Math.sin(phi) + cp0 * Math.cos(phi) * Math.cos(lam);
        if (cosc <= 0) continue;
        const xy = proj([m.lon, m.lat]);
        if (!xy) continue;
        const col = markerColor(m.tone ?? "default");
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        if (pk < 1) {
          ctx.globalAlpha = 0.9 * (1 - pk);
          ctx.beginPath();
          ctx.arc(xy[0], xy[1], 13 * (0.8 + 0.8 * pk), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(xy[0], xy[1], 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(xy[0], xy[1], 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(xy[0], xy[1], 6, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#0D1015";
        ctx.stroke();
        if (m.label) {
          ctx.font = "600 12px Inter, system-ui, sans-serif";
          const w = ctx.measureText(m.label).width + 18;
          const lx = xy[0] + 16;
          const ly = xy[1] - 12;
          ctx.beginPath();
          ctx.roundRect(lx, ly, w, 24, 12);
          ctx.fillStyle = "#0D1015";
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = "#2B323C";
          ctx.stroke();
          ctx.fillStyle = "#ECEEF1";
          ctx.fillText(m.label, lx + 9, ly + 16);
        }
      }
    };

    let id = 0;
    let last = performance.now();
    const spin = rotate && !reduced;
    const loop = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      if (spin && !hover && !tween.current) lonRef.current += degreesPerSecond * dt;
      draw(t);
      const pulsing = !reduced && markers.length > 0 && t - pulseT0.current < Math.max(1300, arcDrawMs);
      if (spin || pulsing || tween.current) id = requestAnimationFrame(loop);
    };
    if (spin || tween.current || (!reduced && markers.length)) id = requestAnimationFrame(loop);
    else draw(performance.now());
    return () => cancelAnimationFrame(id);
  }, [size, radius, points, fLon, fLat, markers, arcs, stateValues, rotate, reduced, hover, degreesPerSecond, graticule, neutralBrazil, highlight, outlines, markerKey, arcDrawMs]);

  return (
    <canvas
      ref={canvas}
      width={size}
      height={size}
      style={{ width: size, height: "auto", maxWidth: "100%", aspectRatio: "1 / 1" }}
      role="img"
      aria-label={ariaLabel}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    />
  );
}

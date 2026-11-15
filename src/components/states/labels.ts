import { geoCentroid, geoMercator } from "d3-geo";
import { brazilOutline, brazilRegion } from "@/components/v6/geo";
import { insidePolygons, preparePolygons } from "@/lib/brgrid";
import type { RegionId } from "@/lib/data/brazil";

export const MAP_W = 680;
export const MAP_H = 660;
export const LABEL_W = 124;
export const LABEL_H = 58;
const SCALES = [1.6, 1.4, 1.25, 1.12, 1, 0.92, 0.85, 0.78, 0.72, 0.66, 0.6];

export function mapProjection() {
  return geoMercator().fitExtent(
    [
      [14, 14],
      [MAP_W - 14, MAP_H - 14],
    ],
    brazilOutline(),
  );
}

export interface LabelSpot {
  x: number;
  y: number;
  scale: number;
  fit: number;
  w: number;
  h: number;
}

export const COMPACT_W = 80;
export const COMPACT_H = 48;

/* Uses the full label where it fits comfortably, and a compact one in narrow regions. */
export interface PlaceOptions {
  /* A circle the label must stay clear of, such as a searched place's marker and its halo. */
  avoid?: { x: number; y: number; r: number } | null;
  width?: number;
  height?: number;
}

export function labelFor(id: RegionId, projection = mapProjection(), opts: PlaceOptions = {}): LabelSpot {
  const full = placeLabel(id, projection, LABEL_W, LABEL_H, opts);
  if (full.fit >= 0.85) return full;
  const compact = placeLabel(id, projection, COMPACT_W, COMPACT_H, opts);
  return compact.fit > full.fit ? compact : full;
}

/* Places a region label at the spot where the largest copy of the label box still lies wholly inside that region. */
const rendered = (s: number) => (s >= 1.12 ? Math.min(1, s / 1.12) : s);

export function placeLabel(id: RegionId, projection = mapProjection(), boxW = LABEL_W, boxH = LABEL_H, opts: PlaceOptions = {}): LabelSpot {
  const W = opts.width ?? MAP_W;
  const H = opts.height ?? MAP_H;
  const avoid = opts.avoid ?? null;
  const clear = (cx: number, cy: number, s: number) => {
    if (!avoid) return true;
    const hw = (boxW * rendered(s)) / 2;
    const hh = (boxH * rendered(s)) / 2;
    const dx = Math.max(Math.abs(avoid.x - cx) - hw, 0);
    const dy = Math.max(Math.abs(avoid.y - cy) - hh, 0);
    return dx * dx + dy * dy > avoid.r * avoid.r;
  };
  const polys = preparePolygons({ features: [brazilRegion(id) as never] });
  const inside = (x: number, y: number) => {
    const ll = projection.invert?.([x, y]);
    return !!ll && insidePolygons(polys, ll[1], ll[0]);
  };
  const fits = (cx: number, cy: number, s: number) => {
    const hw = (boxW * s) / 2;
    const hh = (boxH * s) / 2;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const px = cx - hw + 2 * hw * t;
      const py = cy - hh + 2 * hh * t;
      if (!inside(px, cy - hh) || !inside(px, cy + hh) || !inside(cx - hw, py) || !inside(cx + hw, py)) return false;
    }
    return true;
  };
  const c = projection(geoCentroid(brazilRegion(id))) ?? [W / 2, H / 2];
  let best = { x: c[0], y: c[1], s: 0, d: Infinity };
  const step = Math.max(4, Math.round(W / 130));
  for (let y = 10; y < H - 10; y += step) {
    for (let x = 10; x < W - 10; x += step) {
      if (!inside(x, y)) continue;
      for (const s of SCALES) {
        if (s < best.s) break;
        if (fits(x, y, s) && clear(x, y, s)) {
          const d = (x - c[0]) ** 2 + (y - c[1]) ** 2;
          if (s > best.s || d < best.d) best = { x, y, s, d };
          break;
        }
      }
    }
  }
  const scale = rendered(best.s);
  return { x: best.x, y: best.y, scale, fit: best.s, w: boxW, h: boxH };
}

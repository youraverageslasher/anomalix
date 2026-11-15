export type Ring = number[][];
export type PolygonCoords = Ring[];

interface Geometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: PolygonCoords | PolygonCoords[];
}

export interface FeatureCollection {
  features: { properties?: Record<string, unknown>; geometry: Geometry }[];
}

export interface PreparedPolygon {
  rings: Ring[];
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}


export function preparePolygons(fc: FeatureCollection): PreparedPolygon[] {
  const out: PreparedPolygon[] = [];
  for (const f of fc.features) {
    const polys: PolygonCoords[] =
      f.geometry.type === "Polygon"
        ? [f.geometry.coordinates as PolygonCoords]
        : (f.geometry.coordinates as PolygonCoords[]);
    for (const rings of polys) {
      let minLon = Infinity;
      let maxLon = -Infinity;
      let minLat = Infinity;
      let maxLat = -Infinity;
      for (const [x, y] of rings[0]) {
        if (x < minLon) minLon = x;
        if (x > maxLon) maxLon = x;
        if (y < minLat) minLat = y;
        if (y > maxLat) maxLat = y;
      }
      out.push({ rings, minLon, maxLon, minLat, maxLat });
    }
  }
  return out;
}

function inRing(ring: Ring, lon: number, lat: number): boolean {
  let inside = false;
  for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
    const [xa, ya] = ring[a];
    const [xb, yb] = ring[b];
    if (ya > lat !== yb > lat && lon < ((xb - xa) * (lat - ya)) / (yb - ya) + xa) inside = !inside;
  }
  return inside;
}

export function insidePolygons(polys: PreparedPolygon[], lat: number, lon: number): boolean {
  for (const p of polys) {
    if (lon < p.minLon || lon > p.maxLon || lat < p.minLat || lat > p.maxLat) continue;
    if (!inRing(p.rings[0], lon, lat)) continue;
    let hole = false;
    for (let h = 1; h < p.rings.length; h++) {
      if (inRing(p.rings[h], lon, lat)) {
        hole = true;
        break;
      }
    }
    if (!hole) return true;
  }
  return false;
}

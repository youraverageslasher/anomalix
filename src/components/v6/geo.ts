import { feature, merge } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import landTopo from "world-atlas/land-110m.json";
import brTopo from "../../../public/geo/brazil-states.topo.json";
import { REGIONS, type RegionId } from "@/lib/data/brazil";

type Props = { sigla: string; nome: string };

const land = landTopo as unknown as Topology<{ land: GeometryCollection }>;
const br = brTopo as unknown as Topology<{ states: GeometryCollection<Props> }>;

let landCache: Feature<MultiPolygon | Polygon> | null = null;
export function worldLand(): Feature<MultiPolygon | Polygon> {
  if (!landCache) {
    const fc = feature(land, land.objects.land) as unknown as FeatureCollection<MultiPolygon | Polygon>;
    const polys: number[][][][] = [];
    for (const f of fc.features) {
      const g = f.geometry;
      const list = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      for (const p of list) if (Math.max(...p[0].map((c) => c[1])) > -60) polys.push(p);
    }
    landCache = { type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: polys } };
  }
  return landCache;
}

let statesCache: Feature<MultiPolygon | Polygon, Props>[] | null = null;
export function brazilStates(): Feature<MultiPolygon | Polygon, Props>[] {
  statesCache ??= (feature(br, br.objects.states) as unknown as FeatureCollection<MultiPolygon | Polygon, Props>).features;
  return statesCache;
}

const regionCache = new Map<RegionId, Feature<MultiPolygon>>();
export function brazilRegion(id: RegionId): Feature<MultiPolygon> {
  let r = regionCache.get(id);
  if (!r) {
    const geoms = br.objects.states.geometries.filter((g) => REGIONS[id].states.includes((g.properties as Props).sigla));
    r = { type: "Feature", properties: {}, geometry: merge(br, geoms as never) };
    regionCache.set(id, r);
  }
  return r;
}

export function brazilOutline(): Feature<MultiPolygon> {
  return { type: "Feature", properties: {}, geometry: merge(br, br.objects.states.geometries as never) };
}

import { insidePolygons, preparePolygons, type PreparedPolygon } from "@/lib/brgrid";

let landPrepared: PreparedPolygon[] | null = null;
export function isLand(lon: number, lat: number): boolean {
  landPrepared ??= preparePolygons({ features: [worldLand() as never] });
  return insidePolygons(landPrepared, lat, lon);
}

let statePrepared: { sigla: string; polys: PreparedPolygon[]; minLon: number; maxLon: number; minLat: number; maxLat: number }[] | null = null;
export function brazilStateAt(lon: number, lat: number): string | null {
  statePrepared ??= brazilStates().map((f) => {
    const polys = preparePolygons({ features: [f as never] });
    return {
      sigla: f.properties.sigla,
      polys,
      minLon: Math.min(...polys.map((p) => p.minLon)),
      maxLon: Math.max(...polys.map((p) => p.maxLon)),
      minLat: Math.min(...polys.map((p) => p.minLat)),
      maxLat: Math.max(...polys.map((p) => p.maxLat)),
    };
  });
  if (lon < -74.5 || lon > -28 || lat < -34.5 || lat > 6) return null;
  for (const s of statePrepared) {
    if (lon < s.minLon || lon > s.maxLon || lat < s.minLat || lat > s.maxLat) continue;
    if (insidePolygons(s.polys, lat, lon)) return s.sigla;
  }
  return null;
}

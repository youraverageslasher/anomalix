import { geoArea, geoContains } from "d3-geo";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";
import { brazilStates } from "@/components/v6/geo";
import { REGIONS, regionOf, type RegionId } from "./brazil";

/* What the geocoder said about a place. Coordinates are required; country and admin1 come from Open-Meteo when known. */
export interface PlaceInput {
  lat: number;
  lon: number;
  countryCode?: string | null;
  admin1?: string | null;
}

export type Located =
  | { kind: "brazil"; sigla: string; state: string; region: RegionId; regionName: string; method: "polygon" | "border" | "nearest" | "admin1" }
  | { kind: "brazil-unresolved" }
  | { kind: "foreign"; countryCode: string | null };

const NEAREST_KM = 30;
const EARTH_KM = 6371;

/* English exonyms the geocoder may return for admin1, mapped to the names in the boundary file. */
const ADMIN1_ALIASES: Record<string, string> = { "federal district": "distrito federal" };

export function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^state of\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

type StateFeature = Feature<Polygon | MultiPolygon, { sigla: string; nome: string }>;

let ordered: StateFeature[] | null = null;
function states(): StateFeature[] {
  if (!ordered) {
    ordered = brazilStates()
      .map((f) => {
        if (geoArea(f as never) > 2 * Math.PI) {
          const g = f.geometry;
          const flip = (rings: Position[][]) => rings.map((r) => [...r].reverse());
          const geometry = g.type === "Polygon" ? { ...g, coordinates: flip(g.coordinates) } : { ...g, coordinates: g.coordinates.map(flip) };
          return { ...f, geometry } as StateFeature;
        }
        return f as StateFeature;
      })
      .sort((a, b) => a.properties.sigla.localeCompare(b.properties.sigla));
  }
  return ordered;
}

function rings(f: StateFeature): Position[][] {
  return f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.coordinates.flat();
}

/* Shortest distance in km from a point to a state's boundary, on a local equirectangular plane. */
export function distanceToStateKm(f: StateFeature, lon: number, lat: number): number {
  const k = Math.cos((lat * Math.PI) / 180);
  const toXY = (p: Position) => [((p[0] - lon) * k * Math.PI * EARTH_KM) / 180, ((p[1] - lat) * Math.PI * EARTH_KM) / 180];
  let best = Infinity;
  for (const ring of rings(f)) {
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = toXY(ring[i - 1]);
      const [bx, by] = toXY(ring[i]);
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len));
      const d = Math.hypot(ax + t * dx, ay + t * dy);
      if (d < best) best = d;
    }
  }
  return best;
}

export function stateByAdmin1(admin1: string | null | undefined): StateFeature | null {
  if (!admin1) return null;
  const n = normalizeName(admin1);
  const target = ADMIN1_ALIASES[n] ?? n;
  return states().find((f) => normalizeName(f.properties.nome) === target) ?? null;
}

function found(f: StateFeature, method: "polygon" | "border" | "nearest" | "admin1"): Located {
  const region = regionOf(f.properties.sigla);
  return { kind: "brazil", sigla: f.properties.sigla, state: f.properties.nome, region, regionName: REGIONS[region].name, method };
}

/*
 * Order of evidence:
 * 1 a country code other than BR means foreign, whatever the geometry says;
 * 2 point in polygon over the states, in a fixed order;
 * 3 on a border, when the geocoder's admin1 names a neighbor within 30 km, the geocoder wins;
 * 4 no polygon (coast, islands, simplified edges): the nearest state within 30 km;
 * 5 otherwise admin1 matched by name, accents ignored.
 */
export function locate(p: PlaceInput): Located {
  const cc = p.countryCode ? p.countryCode.toUpperCase() : null;
  if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return { kind: "foreign", countryCode: cc };
  if (cc && cc !== "BR") return { kind: "foreign", countryCode: cc };
  const pt: [number, number] = [p.lon, p.lat];
  const byName = cc === "BR" ? stateByAdmin1(p.admin1) : null;

  const hit = states().find((f) => geoContains(f as never, pt));
  if (hit) {
    if (byName && byName.properties.sigla !== hit.properties.sigla && distanceToStateKm(byName, p.lon, p.lat) <= NEAREST_KM) return found(byName, "border");
    return found(hit, "polygon");
  }

  let near: { f: StateFeature; d: number } | null = null;
  for (const f of states()) {
    const d = distanceToStateKm(f, p.lon, p.lat);
    if (d <= NEAREST_KM && (!near || d < near.d)) near = { f, d };
  }
  if (near) return found(byName && distanceToStateKm(byName, p.lon, p.lat) <= NEAREST_KM ? byName : near.f, "nearest");
  if (byName) return found(byName, "admin1");
  return cc === "BR" ? { kind: "brazil-unresolved" } : { kind: "foreign", countryCode: cc };
}

/* "{City}, {State}, {Region}" for Brazilian places, the geocoder's own label otherwise. */
export function placeLine(name: string, loc: Located): string {
  const city = name.split(",")[0].trim();
  if (loc.kind === "brazil") return `${city}, ${loc.state}, ${loc.regionName}`;
  return name;
}

export interface Highlight {
  sigla: string;
  region: RegionId;
}

export function highlightOf(loc: Located | null): Highlight | null {
  return loc && loc.kind === "brazil" ? { sigla: loc.sigla, region: loc.region } : null;
}

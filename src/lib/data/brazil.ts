import { insidePolygons, preparePolygons, type FeatureCollection, type PreparedPolygon } from "../brgrid";

export const GRID_STEP = 1;

export type RegionId = "N" | "NE" | "CW" | "SE" | "S";

export const REGIONS: Record<RegionId, { name: string; states: string[] }> = {
  N: { name: "North", states: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"] },
  NE: { name: "Northeast", states: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"] },
  CW: { name: "Center-West", states: ["DF", "GO", "MT", "MS"] },
  SE: { name: "Southeast", states: ["ES", "MG", "RJ", "SP"] },
  S: { name: "South", states: ["PR", "RS", "SC"] },
};

export const CAPITALS: Record<string, { name: string; lat: number; lon: number }> = {
  AC: { name: "Rio Branco", lat: -9.975, lon: -67.81 },
  AL: { name: "Maceió", lat: -9.665, lon: -35.735 },
  AP: { name: "Macapá", lat: 0.035, lon: -51.07 },
  AM: { name: "Manaus", lat: -3.119, lon: -60.022 },
  BA: { name: "Salvador", lat: -12.971, lon: -38.501 },
  CE: { name: "Fortaleza", lat: -3.732, lon: -38.527 },
  DF: { name: "Brasília", lat: -15.794, lon: -47.882 },
  ES: { name: "Vitória", lat: -20.315, lon: -40.312 },
  GO: { name: "Goiânia", lat: -16.686, lon: -49.265 },
  MA: { name: "São Luís", lat: -2.53, lon: -44.303 },
  MT: { name: "Cuiabá", lat: -15.601, lon: -56.097 },
  MS: { name: "Campo Grande", lat: -20.469, lon: -54.62 },
  MG: { name: "Belo Horizonte", lat: -19.917, lon: -43.934 },
  PA: { name: "Belém", lat: -1.456, lon: -48.49 },
  PB: { name: "João Pessoa", lat: -7.115, lon: -34.861 },
  PR: { name: "Curitiba", lat: -25.429, lon: -49.271 },
  PE: { name: "Recife", lat: -8.048, lon: -34.877 },
  PI: { name: "Teresina", lat: -5.089, lon: -42.802 },
  RJ: { name: "Rio de Janeiro", lat: -22.907, lon: -43.173 },
  RN: { name: "Natal", lat: -5.794, lon: -35.211 },
  RS: { name: "Porto Alegre", lat: -30.035, lon: -51.218 },
  RO: { name: "Porto Velho", lat: -8.762, lon: -63.904 },
  RR: { name: "Boa Vista", lat: 2.82, lon: -60.672 },
  SC: { name: "Florianópolis", lat: -27.595, lon: -48.548 },
  SP: { name: "São Paulo", lat: -23.551, lon: -46.633 },
  SE: { name: "Aracaju", lat: -10.947, lon: -37.073 },
  TO: { name: "Palmas", lat: -10.249, lon: -48.324 },
};

export interface GridPoint {
  lat: number;
  lon: number;
  trend: number;
  state: string;
}

export interface StateValue {
  sigla: string;
  name: string;
  region: RegionId;
  value: number;
  gridPoints: number;
  capital: { name: string; trend: number };
}

export interface RegionValue {
  id: RegionId;
  name: string;
  mean: number;
  min: number;
  max: number;
  count: number;
}

export interface BrazilAggregate {
  states: StateValue[];
  regions: RegionValue[];
  national: { mean: number; count: number };
}

export function stateIndex(fc: FeatureCollection): { sigla: string; name: string; polys: PreparedPolygon[] }[] {
  return fc.features.map((f) => ({
    sigla: String(f.properties?.sigla),
    name: String(f.properties?.nome),
    polys: preparePolygons({ features: [f] }),
  }));
}

export function gridCenters(fc: FeatureCollection): { lat: number; lon: number; state: string }[] {
  const states = stateIndex(fc);
  const out: { lat: number; lon: number; state: string }[] = [];
  for (let lat = -33.5; lat <= 5.5; lat += GRID_STEP) {
    for (let lon = -73.5; lon <= -34.5; lon += GRID_STEP) {
      const s = states.find((st) => insidePolygons(st.polys, lat, lon));
      if (s) out.push({ lat, lon, state: s.sigla });
    }
  }
  return out;
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function regionOf(sigla: string): RegionId {
  return (Object.keys(REGIONS) as RegionId[]).find((r) => REGIONS[r].states.includes(sigla)) as RegionId;
}

export function aggregate(
  points: GridPoint[],
  capitalTrends: Record<string, number>,
  stateNames: Record<string, string>,
): BrazilAggregate {
  const states: StateValue[] = Object.keys(CAPITALS).map((sigla) => {
    const inside = points.filter((p) => p.state === sigla).map((p) => p.trend);
    const cap = capitalTrends[sigla];
    const samples = Number.isFinite(cap) ? [...inside, cap] : inside;
    return {
      sigla,
      name: stateNames[sigla] ?? sigla,
      region: regionOf(sigla),
      value: samples.length ? mean(samples) : NaN,
      gridPoints: inside.length,
      capital: { name: CAPITALS[sigla].name, trend: cap },
    };
  });
  const regions: RegionValue[] = (Object.keys(REGIONS) as RegionId[]).map((id) => {
    const vals = points.filter((p) => REGIONS[id].states.includes(p.state)).map((p) => p.trend);
    return { id, name: REGIONS[id].name, mean: mean(vals), min: Math.min(...vals), max: Math.max(...vals), count: vals.length };
  });
  return { states, regions, national: { mean: mean(points.map((p) => p.trend)), count: points.length } };
}

import { POWER_END, POWER_START } from "./data/power";

export const SJRP = { lat: -20.81, lon: -49.38, nome: "São José do Rio Preto, SP" };

export function parseCoords(input: string): { lat: number; lon: number } | null {
  const m = input.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1].replace(",", "."));
  const lon = Number(m[2].replace(",", "."));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

export interface Place {
  nome: string;
  lat: number;
  lon: number;
  cc?: string;
  admin1?: string;
}

export function reportHref(p: Place): string {
  const q = new URLSearchParams({
    lat: p.lat.toFixed(4),
    lon: p.lon.toFixed(4),
    name: p.nome,
    from: String(POWER_START),
    to: String(POWER_END),
    season: "ALL",
  });
  if (p.cc) q.set("cc", p.cc);
  if (p.admin1) q.set("admin1", p.admin1);
  return `/report?${q.toString()}`;
}

export const GLOBAL_REPORT_HREF = "/report?region=global";

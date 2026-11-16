/* Size of a MERRA-2 grid cell: 0.5 degrees of latitude by 0.625 degrees of longitude. East-west width shrinks with cos(latitude). */
import { CELL_LAT, CELL_LON } from "./power";

export const CELL_LAT_DEG = CELL_LAT;
export const CELL_LON_DEG = CELL_LON;
export const KM_PER_DEGREE = 111.32;

export function cellKm(lat: number): { ns: number; ew: number } {
  const ns = CELL_LAT_DEG * KM_PER_DEGREE;
  const ew = CELL_LON_DEG * KM_PER_DEGREE * Math.cos((Math.min(90, Math.abs(lat)) * Math.PI) / 180);
  return { ns: Math.round(ns), ew: Math.max(1, Math.round(ew)) };
}

export function cellText(lat: number, sep = " × "): string {
  const { ns, ew } = cellKm(lat);
  return `${ns}${sep}${ew} km`;
}

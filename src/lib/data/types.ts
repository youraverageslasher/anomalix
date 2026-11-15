export interface MonthValue {
  year: number;
  month: number;
  value: number;
}

export type Season = "ALL" | "DJF" | "MAM" | "JJA" | "SON";

export interface Place {
  name: string;
  admin1?: string;
  country?: string;
  lat: number;
  lon: number;
}

export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

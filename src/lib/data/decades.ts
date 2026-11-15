import type { MonthValue } from "./types";
import { POWER_END } from "./power";

export interface Decade {
  label: string;
  from: number;
  to: number;
  partial: boolean;
}

/* Full decades, then the current decade up to the last year that can be complete, as a labeled partial period.
   A period counts for a cell only when every one of its years is complete, so nothing is extrapolated. */
export const DECADES: Decade[] = [
  { label: "1980s", from: 1981, to: 1990, partial: false },
  { label: "1990s", from: 1991, to: 2000, partial: false },
  { label: "2000s", from: 2001, to: 2010, partial: false },
  { label: "2010s", from: 2011, to: 2020, partial: false },
  { label: "2020s so far", from: 2021, to: POWER_END - 1, partial: true },
];

export const BASELINE_DECADE = 0;

/* Mean temperature of each period from complete years only (12 valid months). null when any year of the period is missing. */
export function decadeMeans(months: MonthValue[], decades: Decade[] = DECADES): (number | null)[] {
  const byYear = new Map<number, number[]>();
  for (const m of months) {
    if (!Number.isFinite(m.value) || m.month < 1 || m.month > 12) continue;
    const list = byYear.get(m.year) ?? [];
    list[m.month - 1] = m.value;
    byYear.set(m.year, list);
  }
  const annual = new Map<number, number>();
  for (const [year, vals] of byYear) {
    let n = 0;
    let s = 0;
    for (let i = 0; i < 12; i++) {
      const v = vals[i];
      if (v !== undefined && Number.isFinite(v)) {
        n++;
        s += v;
      }
    }
    if (n === 12) annual.set(year, s / 12);
  }
  return decades.map((d) => {
    let s = 0;
    for (let y = d.from; y <= d.to; y++) {
      const v = annual.get(y);
      if (v === undefined) return null;
      s += v;
    }
    return s / (d.to - d.from + 1);
  });
}

export interface DecadeCell {
  lat: number;
  lon: number;
  state: string;
  /* Mean °C per period in DECADES order; null means no data for that period. */
  v: (number | null)[];
}

export interface DecadeGrid {
  generatedAt: string;
  source: string;
  step: number;
  decades: Decade[];
  cells: DecadeCell[];
}

/* Anomaly of a cell against its own baseline decade; null when either value is missing. */
export function cellAnomaly(c: DecadeCell, k: number, base = BASELINE_DECADE): number | null {
  const a = c.v[k];
  const b = c.v[base];
  return a === null || a === undefined || b === null || b === undefined ? null : a - b;
}

/* Mean anomaly over the cells that have both values, with the count used. */
export function meanAnomaly(cells: DecadeCell[], k: number, base = BASELINE_DECADE): { mean: number; count: number } {
  let s = 0;
  let n = 0;
  for (const c of cells) {
    const a = cellAnomaly(c, k, base);
    if (a !== null) {
      s += a;
      n++;
    }
  }
  return { mean: n ? s / n : NaN, count: n };
}

/* A period is shown only when at least one cell has data for it. */
export function availableDecades(g: DecadeGrid): number[] {
  return g.decades.map((_, k) => k).filter((k) => g.cells.some((c) => c.v[k] !== null && c.v[k] !== undefined));
}

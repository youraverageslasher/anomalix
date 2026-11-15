import type { MonthValue } from "./types";

/* What a response actually holds, so no period in the UI is ever typed in. */
export interface Coverage {
  /* First and last year with at least one valid value (fill values already dropped by the parser). */
  firstValid: number;
  lastValid: number;
  /* First and last year with all twelve months valid, and how many such years exist. */
  firstComplete: number;
  lastComplete: number;
  completeYears: number;
}

export function coverage(months: MonthValue[]): Coverage | null {
  const count = new Map<number, number>();
  for (const m of months) if (Number.isFinite(m.value) && m.month >= 1 && m.month <= 12) count.set(m.year, (count.get(m.year) ?? 0) + 1);
  if (count.size === 0) return null;
  const years = [...count.keys()].sort((a, b) => a - b);
  const complete = years.filter((y) => (count.get(y) ?? 0) === 12);
  return {
    firstValid: years[0],
    lastValid: years[years.length - 1],
    firstComplete: complete[0] ?? NaN,
    lastComplete: complete[complete.length - 1] ?? NaN,
    completeYears: complete.length,
  };
}

export interface Span {
  from: number;
  to: number;
  n: number;
}

/* The years that really entered the trend: the first and last point of the yearly series. */
export function spanOf(a: { annual: { year: number }[] }): Span | null {
  const n = a.annual.length;
  if (!n) return null;
  return { from: a.annual[0].year, to: a.annual[n - 1].year, n };
}

export type SourceKind = "power" | "gistemp";

const NOUN: Record<SourceKind, string> = { power: "NASA reanalysis", gistemp: "NASA GISTEMP" };

/* "{from} to {to}, {n} years of NASA reanalysis" */
export function periodText(s: Span, kind: SourceKind, unit = "years"): string {
  return `${s.from} to ${s.to}, ${s.n} ${s.n === 1 ? unit.replace(/s$/, "") : unit} of ${NOUN[kind]}`;
}

/* "{from}-{to}" */
export const dash = (s: Span | { from: number; to: number }) => `${s.from}-${s.to}`;

/* One honest line when the source holds months after the last complete year. */
export function partialNote(c: Coverage | null | undefined, s: Span | null): string {
  if (!c || !s || s.to !== c.lastComplete || c.lastValid <= c.lastComplete) return "";
  return `${c.lastValid} has valid months but is not complete yet, so it is left out of the trend.`;
}

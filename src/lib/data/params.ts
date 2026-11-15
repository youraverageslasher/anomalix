import type { AnalyzeOptions } from "./analyze";
import type { Season } from "./types";

const SEASONS: Season[] = ["ALL", "DJF", "MAM", "JJA", "SON"];

export function readOptions(sp: URLSearchParams, minYear: number, maxYear: number): AnalyzeOptions | string {
  const start = sp.get("start") ? Number(sp.get("start")) : undefined;
  const end = sp.get("end") ? Number(sp.get("end")) : undefined;
  const season = (sp.get("season") ?? "ALL").toUpperCase() as Season;
  if (!SEASONS.includes(season)) return "season must be ALL, DJF, MAM, JJA or SON";
  for (const y of [start, end]) {
    if (y !== undefined && (!Number.isInteger(y) || y < minYear || y > maxYear)) {
      return `years must be between ${minYear} and ${maxYear}`;
    }
  }
  return { startYear: start, endYear: end, season };
}

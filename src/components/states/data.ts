import grid from "../../../public/data/brazil-grid.json";
import { REGIONS, regionOf, type RegionId } from "@/lib/data/brazil";

export interface StateRow {
  sigla: string;
  name: string;
  region: RegionId;
  value: number;
  gridPoints: number;
  capital: string;
  rank: number;
}

export interface RegionRow {
  id: RegionId;
  name: string;
  mean: number;
  min: number;
  max: number;
  count: number;
  states: StateRow[];
}

/* States with no sea coast, a fixed geographic fact used only to group grid points. */
export const LANDLOCKED = ["AC", "AM", "RR", "RO", "TO", "MT", "MS", "GO", "DF", "MG"];

export const GRID = grid;
export const POINT_COUNT = grid.points.length;
export const NATIONAL = grid.national.mean;
export const PERIOD = grid.period;

export const STATES: StateRow[] = [...grid.states]
  .sort((a, b) => b.value - a.value)
  .map((s, i) => ({
    sigla: s.sigla,
    name: s.name,
    region: regionOf(s.sigla),
    value: s.value,
    gridPoints: s.gridPoints,
    capital: s.capital.name,
    rank: i + 1,
  }));

export const STATE_VALUES: Record<string, number> = Object.fromEntries(STATES.map((s) => [s.sigla, s.value]));

export const REGION_ROWS: RegionRow[] = grid.regions
  .map((r) => ({
    id: r.id as RegionId,
    name: REGIONS[r.id as RegionId].name,
    mean: r.mean,
    min: r.min,
    max: r.max,
    count: r.count,
    states: STATES.filter((s) => s.region === r.id),
  }))
  .sort((a, b) => b.mean - a.mean);

function meanOf(values: number[]) {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

const inland = grid.points.filter((p) => LANDLOCKED.includes(p.state)).map((p) => p.trend);
const coastal = grid.points.filter((p) => !LANDLOCKED.includes(p.state)).map((p) => p.trend);

export const INSIGHT = {
  fastest: STATES[0],
  slowest: STATES[STATES.length - 1],
  ratio: STATES[0].value / STATES[STATES.length - 1].value,
  topRegion: REGION_ROWS[0],
  bottomRegion: REGION_ROWS[REGION_ROWS.length - 1],
  inland: { mean: meanOf(inland), count: inland.length },
  coastal: { mean: meanOf(coastal), count: coastal.length },
  allPositive: grid.points.every((p) => p.trend > 0),
  minPoint: Math.min(...grid.points.map((p) => p.trend)),
};

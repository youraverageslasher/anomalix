import { describe, expect, it } from "vitest";
import { availableDecades, cellAnomaly, decadeMeans, meanAnomaly, type DecadeCell, type DecadeGrid } from "@/lib/data/decades";
import { parsePowerMonthly } from "@/lib/data/power";

/* Synthetic test inputs only, never shown in the UI. Real values come from NASA POWER. */
function powerJson(from: number, to: number, value: (y: number, m: number) => number) {
  const T2M: Record<string, number> = {};
  for (let y = from; y <= to; y++) {
    for (let m = 1; m <= 12; m++) T2M[`${y}${String(m).padStart(2, "0")}`] = value(y, m);
    T2M[`${y}13`] = 9999;
  }
  return { header: { fill_value: -999 }, properties: { parameter: { T2M } } };
}

const two = [
  { label: "a", from: 2001, to: 2002, partial: false },
  { label: "b", from: 2003, to: 2004, partial: true },
];

describe("decade means", () => {
  it("averages complete years and ignores the YYYY13 key", () => {
    const months = parsePowerMonthly(powerJson(2001, 2004, (y) => y - 2000), "T2M");
    expect(decadeMeans(months, two)).toEqual([1.5, 3.5]);
  });
  it("leaves a period empty when one of its years has a -999 month", () => {
    const months = parsePowerMonthly(powerJson(2001, 2004, (y, m) => (y === 2004 && m === 6 ? -999 : 1)), "T2M");
    expect(decadeMeans(months, two)).toEqual([1, null]);
  });
  it("never extrapolates a period past the data", () => {
    const months = parsePowerMonthly(powerJson(2001, 2003, () => 1), "T2M");
    expect(decadeMeans(months, two)[1]).toBeNull();
  });
});

describe("anomalies", () => {
  const cells: DecadeCell[] = [
    { lat: 0, lon: 0, state: "AM", v: [10, 11] },
    { lat: 1, lon: 0, state: "AM", v: [20, 23] },
    { lat: 2, lon: 0, state: "PA", v: [null, 5] },
  ];
  it("measures each cell against its own baseline period", () => {
    expect(cellAnomaly(cells[0], 1)).toBe(1);
    expect(cellAnomaly(cells[2], 1)).toBeNull();
  });
  it("averages only the cells with both values", () => {
    expect(meanAnomaly(cells, 1)).toEqual({ mean: 2, count: 2 });
  });
  it("offers only periods that some cell has", () => {
    const g: DecadeGrid = { generatedAt: "", source: "", step: 1, decades: [...two, { label: "c", from: 2005, to: 2006, partial: true }], cells: cells.map((c) => ({ ...c, v: [...c.v, null] })) };
    expect(availableDecades(g)).toEqual([0, 1]);
  });
});

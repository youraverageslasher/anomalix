import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { insidePolygons, preparePolygons } from "@/lib/brgrid";
import { aggregate, gridCenters } from "@/lib/data/brazil";

const geo = (f: string) => JSON.parse(readFileSync(path.join(__dirname, "..", "public", "geo", f), "utf8"));
const brFc = geo("brazil-states.geojson");
const brazil = preparePolygons(brFc);

describe("point in polygon", () => {
  it("Brazilian cities fall inside Brazil", () => {
    expect(insidePolygons(brazil, -20.81, -49.38)).toBe(true);
    expect(insidePolygons(brazil, -29.17, -51.52)).toBe(true);
    expect(insidePolygons(brazil, -3.1, -60.02)).toBe(true);
  });
  it("Buenos Aires and Lima fall outside", () => {
    expect(insidePolygons(brazil, -34.6, -58.38)).toBe(false);
    expect(insidePolygons(brazil, -12.05, -77.04)).toBe(false);
  });
});

describe("Brazil 1 degree grid file", () => {
  const grid = JSON.parse(readFileSync(path.join(__dirname, "..", "public", "data", "brazil-grid.json"), "utf8"));
  const names = Object.fromEntries(brFc.features.map((f: { properties: { sigla: string; nome: string } }) => [f.properties.sigla, f.properties.nome]));
  it("has one point per 1 degree center inside Brazil, each in its own state", () => {
    const centers = gridCenters(brFc);
    expect(grid.points).toHaveLength(centers.length);
    grid.points.forEach((p: { lat: number; lon: number; state: string }, i: number) => {
      expect([p.lat, p.lon, p.state]).toEqual([centers[i].lat, centers[i].lon, centers[i].state]);
    });
  });
  it("stored states, regions and national mean match a fresh aggregation", () => {
    const fresh = aggregate(grid.points, grid.capitals, names);
    expect(grid.national.count).toBe(fresh.national.count);
    expect(grid.national.mean).toBeCloseTo(fresh.national.mean, 12);
    expect(grid.states).toHaveLength(27);
    fresh.states.forEach((s, i) => expect(grid.states[i].value).toBeCloseTo(s.value, 12));
    fresh.regions.forEach((r, i) => expect(grid.regions[i].mean).toBeCloseTo(r.mean, 12));
  });
});

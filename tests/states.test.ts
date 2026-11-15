import { describe, expect, it } from "vitest";
import { labelFor, mapProjection } from "@/components/states/labels";
import { REGIONS, type RegionId } from "@/lib/data/brazil";
import { INSIGHT, POINT_COUNT, REGION_ROWS, STATES } from "@/components/states/data";

describe("states page data", () => {
  it("ranks all 27 states, fastest first, from the grid file", () => {
    expect(STATES).toHaveLength(27);
    for (let i = 1; i < STATES.length; i++) expect(STATES[i - 1].value).toBeGreaterThanOrEqual(STATES[i].value);
    expect(REGION_ROWS.reduce((s, r) => s + r.count, 0)).toBe(POINT_COUNT);
    expect(INSIGHT.ratio).toBeCloseTo(STATES[0].value / STATES[26].value, 12);
  });
});

describe("region labels", () => {
  const projection = mapProjection();
  const spots = (Object.keys(REGIONS) as RegionId[]).map((id) => ({ id, ...labelFor(id, projection) }));
  it("every label box fits inside its own region at a readable size", () => {
    for (const s of spots) expect(s.fit, s.id).toBeGreaterThanOrEqual(0.85);
  });
  it("no two labels overlap", () => {
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++) {
        const a = spots[i];
        const b = spots[j];
        const ox = Math.abs(a.x - b.x) < (a.w * a.scale + b.w * b.scale) / 2;
        const oy = Math.abs(a.y - b.y) < (a.h * a.scale + b.h * b.scale) / 2;
        expect(ox && oy, `${a.id} vs ${b.id}`).toBe(false);
      }
  });
});

import { describe, expect, it } from "vitest";
import { rollingWindows, windowStory } from "@/lib/data/windows";

/* Synthetic test inputs only, never shown in the UI. */
const series = (n: number, f: (i: number) => number) => Array.from({ length: n }, (_, i) => ({ year: 1981 + i, value: f(i) }));

describe("window stability", () => {
  it("hides below 35 years and builds one window per start year", () => {
    expect(rollingWindows(series(34, (i) => i))).toBeNull();
    const w = rollingWindows(series(45, (i) => 0.03 * i + (i % 2 ? 0.02 : -0.02)))!;
    expect(w).toHaveLength(21);
    expect(w[0]).toMatchObject({ from: 1981, to: 2005 });
    expect(w[20]).toMatchObject({ from: 2001, to: 2025 });
  });
  it("a steady rise is robust across windows", () => {
    const w = rollingWindows(series(45, (i) => 0.03 * i + (i % 2 ? 0.02 : -0.02)))!;
    expect(windowStory(w, true, 1)).toEqual({ kind: "robust", k: 21, n: 21, direction: 1 });
  });
  it("an Inconclusive series whose windows change sign is reported as flips", () => {
    const w = rollingWindows(series(45, (i) => (i < 22 ? 0.05 * i : 0.05 * (44 - i)) + (i % 2 ? 0.05 : -0.05)))!;
    const s = windowStory(w, false, 1);
    expect(s.kind).toBe("flips");
    if (s.kind === "flips") expect(s.m).toBeGreaterThan(0);
  });
  it("otherwise a neutral count", () => {
    const w = rollingWindows(series(45, (i) => (i < 20 ? 0.05 * i : 1) + (i % 2 ? 0.02 : -0.02)))!;
    expect(windowStory(w, true, 1).kind).toBe("count");
  });
});

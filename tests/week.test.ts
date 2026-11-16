import { afterEach, describe, expect, it, vi } from "vitest";
import { buildWeek, parseForecast, parsePowerDaily, periodLabel, summaryLine, weekReport, windowStats, type DailyClimate } from "@/lib/data/week";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/* 10 years of synthetic days: rain on every 4th day, tmax rising 0..9 by year, tmin 10 below. */
const history: DailyClimate[] = [];
for (let y = 2000; y < 2010; y++)
  for (let d = 0; d < 365; d++) {
    const date = new Date(Date.UTC(y, 0, 1 + d)).toISOString().slice(0, 10);
    history.push({ date, tmax: 20 + (y - 2000), tmin: 10 + (y - 2000), rain: d % 4 === 0 ? 5 : 0 });
  }

describe("historical rain frequency and percentiles", () => {
  it("rain frequency is the share of window days with 1 mm or more", () => {
    const s = windowStats(history, "2026-07-15");
    expect(s.n).toBe(31 * 10);
    expect(s.years).toBe(10);
    expect(s.rainFreq).toBeGreaterThan(0.22);
    expect(s.rainFreq).toBeLessThan(0.28);
  });
  it("percentiles 10 and 90 of the window, and the forecast's rank", () => {
    const s = windowStats(history, "2026-07-15", 27.5);
    expect(s.tmaxP10).toBeCloseTo(20.9, 6);
    expect(s.tmaxP90).toBeCloseTo(28.1, 6);
    expect(s.tminP10).toBeCloseTo(10.9, 6);
    expect(s.hotterThan).toBeCloseTo(0.8, 12);
  });
  it("the window wraps around the new year", () => {
    const s = windowStats(history, "2026-01-03");
    expect(s.n).toBe(31 * 10);
  });
  it("drops POWER fill values and the bad keys", () => {
    const rows = parsePowerDaily({
      header: { fill_value: -999 },
      properties: { parameter: { T2M_MAX: { "20200101": 30, "20200102": -999, "20200103": 31 }, T2M_MIN: { "20200101": 20, "20200102": 19, "20200103": 21 }, PRECTOTCORR: { "20200101": 0, "20200102": 1, "20200103": -999 } } },
    });
    expect(rows.map((r) => r.date)).toEqual(["2020-01-01"]);
  });
});

describe("the week", () => {
  const forecast = parseForecast({
    timezone: "America/Sao_Paulo",
    daily: {
      time: ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"],
      temperature_2m_max: [32.4, 31.7, 32.5, 31.7, 34.1, 34.8, 33.2],
      temperature_2m_min: [21.9, 20.8, 21.5, 21.1, 22.5, 22.9, 22.6],
      precipitation_probability_max: [10, 20, 84, 60, 30, 5, null],
      precipitation_sum: [0, 0, 5.8, 0.1, 0, 0, null],
    },
  });
  it("parses the Open-Meteo daily block, keeping gaps as null", () => {
    expect(forecast?.days.length).toBe(7);
    expect(forecast?.days[6].rainProb).toBeNull();
  });
  it("builds a summary line from the numbers", () => {
    const w = buildWeek(forecast!, history, { forecastUrl: "f", climateUrl: "c" })!;
    expect(w.days[0].weekday).toBe("Mon");
    expect(w.summary).toBe("Next 7 days: rain likely Wed and Thu, highs warmer than 100% of mid-November days since 2000.");
    expect(periodLabel("2026-11-05")).toBe("early November");
    expect(summaryLine(w.days.map((d) => ({ ...d, rainProb: 0, climate: { ...d.climate, hotterThan: 0.2 } })), 1981)).toBe(
      "Next 7 days: rain unlikely, highs cooler than 80% of mid-November days since 1981.",
    );
  });
});

describe("API failures", () => {
  it("returns an error, never throws, when Open-Meteo is unreachable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url.includes("open-meteo") ? Promise.reject(new TypeError("fetch failed")) : new Response(JSON.stringify({ properties: { parameter: {} } })))),
    );
    const r = await weekReport(-20.82, -49.38, 2025);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/^Open-Meteo/);
  });
  it("returns an error for an empty or unreadable forecast", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(url.includes("open-meteo") ? "not json" : "{}")));
    const r = await weekReport(-20.82, -49.38, 2025);
    expect(r.ok).toBe(false);
  });
});

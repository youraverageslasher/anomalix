/*
 * Anomalix: Brazil 1 degree grid and state, region and national aggregation (build:grid)
 *
 * Source: NASA POWER monthly point API, parameter T2M (air temperature at 2 m, °C), community RE,
 *   MERRA-2 reanalysis on a 0.5 x 0.625 degree grid.
 *   URL: https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=T2M&community=RE
 *        &longitude={lon}&latitude={lat}&start={POWER_START}&end={POWER_END}&format=JSON
 * Grid: centers at every whole degree plus 0.5 (lat -33.5 to 5.5, lon -73.5 to -34.5) that fall inside
 *   a Brazilian state polygon (public/geo/brazil-states.geojson). Each point is tagged with its state.
 *   The 27 state capitals are fetched too.
 * Per point (same engine as the app, src/lib/data/analyze.ts): annual means of complete years,
 *   OLS slope in °C per decade. The period written to the file is read from the data: the first and
 *   last complete year shared by every point.
 * Aggregation (src/lib/data/brazil.ts):
 *   state value  = mean of the grid points inside the state plus its capital
 *   region value = mean of the grid points in the region (North, Northeast, Center-West,
 *                  Southeast, South), with min, max and count
 *   national     = mean of all grid points
 * Network: at most 4 requests at once, one retry per point; on HTTP 429 (rate limit) it waits 60 s
 *   and tries again. Any remaining failure aborts without writing.
 * Output: public/data/brazil-grid.json
 * Usage: npm run build:grid
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as analyzeLib from "../src/lib/data/analyze.ts";
import * as rangeLib from "../src/lib/data/range.ts";
import * as powerLib from "../src/lib/data/power.ts";
import * as brazilLib from "../src/lib/data/brazil.ts";

const esm = (m) => (m.default && typeof m.default === "object" ? { ...m.default, ...m } : m);
const { analyze } = esm(analyzeLib);
const { spanOf } = esm(rangeLib);
let periodFrom = -Infinity;
let periodTo = Infinity;
const { parsePowerMonthly, powerUrl, completeYears } = esm(powerLib);
const { gridCenters, aggregate, CAPITALS } = esm(brazilLib);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const fc = JSON.parse(readFileSync(path.join(root, "public/geo/brazil-states.geojson"), "utf8"));
const names = Object.fromEntries(fc.features.map((f) => [f.properties.sigla, f.properties.nome]));
const grid = gridCenters(fc);
const caps = Object.entries(CAPITALS);
const jobs = [...grid.map((g) => ({ kind: "grid", ...g })), ...caps.map(([sigla, c]) => ({ kind: "capital", sigla, lat: c.lat, lon: c.lon }))];
console.log(`${grid.length} grid points + ${caps.length} capitals`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function trendAt(lat, lon) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(powerUrl(lat, lon, "T2M"), { signal: AbortSignal.timeout(30000) });
      if (res.status === 429) {
        console.warn("rate limited by NASA POWER, waiting 60 s");
        await sleep(60000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const a = analyze(completeYears(parsePowerMonthly(await res.json(), "T2M")));
      if (!a.ok) throw new Error(a.error);
      const s = spanOf(a);
      periodFrom = Math.max(periodFrom, s.from);
      periodTo = Math.min(periodTo, s.to);
      return a.trend.perDecade;
    } catch (e) {
      if (attempt >= 1) throw new Error(`(${lat}, ${lon}): ${e.message}`);
      await sleep(1500);
    }
  }
  throw new Error(`(${lat}, ${lon}): still rate limited after several waits`);
}

const results = new Array(jobs.length);
let next = 0;
let done = 0;
async function worker() {
  while (next < jobs.length) {
    const i = next++;
    results[i] = await trendAt(jobs[i].lat, jobs[i].lon);
    if (++done % 50 === 0) console.log(`${done}/${jobs.length}`);
    await sleep(150);
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);

const points = grid.map((g, i) => ({ lat: g.lat, lon: g.lon, state: g.state, trend: Math.round(results[i] * 10000) / 10000 }));
const capitalTrends = Object.fromEntries(caps.map(([sigla], k) => [sigla, Math.round(results[grid.length + k] * 10000) / 10000]));
const out = {
  generatedAt: new Date().toISOString(),
  source: "NASA POWER T2M monthly, community RE",
  period: `${periodFrom}-${periodTo}`,
  step: 1,
  points,
  capitals: capitalTrends,
  ...aggregate(points, capitalTrends, names),
};
writeFileSync(path.join(root, "public/data/brazil-grid.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`wrote public/data/brazil-grid.json: ${points.length} points`);

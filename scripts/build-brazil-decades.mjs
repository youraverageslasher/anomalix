/*
 * Anomalix: Brazil decade means on the 1 degree grid (build:decades)
 *
 * Source: NASA POWER monthly point API, parameter T2M (air temperature at 2 m, °C), community RE,
 *   MERRA-2 based. Same URL and parser as the app (src/lib/data/power.ts): YYYY13 keys skipped,
 *   the -999 fill value dropped.
 * Grid: the points of public/data/brazil-grid.json, in the same order.
 * Per point: mean of each period in src/lib/data/decades.ts (four full decades and the current
 *   decade so far as a labeled partial period), from complete years only. A period with
 *   any missing year is written as null and drawn empty. Nothing is interpolated or extrapolated.
 * Network: at most 4 requests at once; on HTTP 429 it waits 60 s. Any remaining failure aborts.
 * Output: public/data/brazil-decades.json
 * Usage: npm run build:decades
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as powerLib from "../src/lib/data/power.ts";
import * as decadesLib from "../src/lib/data/decades.ts";

const esm = (m) => (m.default && typeof m.default === "object" ? { ...m.default, ...m } : m);
const { parsePowerMonthly, powerUrl } = esm(powerLib);
const { decadeMeans, DECADES } = esm(decadesLib);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const grid = JSON.parse(readFileSync(path.join(root, "public/data/brazil-grid.json"), "utf8"));
const points = grid.points;
console.log(`${points.length} grid points`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function meansAt(lat, lon) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(powerUrl(lat, lon, "T2M"), { signal: AbortSignal.timeout(30000) });
      if (res.status === 429) {
        console.warn("rate limited by NASA POWER, waiting 60 s");
        await sleep(60000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return decadeMeans(parsePowerMonthly(await res.json(), "T2M"));
    } catch (e) {
      if (attempt >= 1) throw new Error(`(${lat}, ${lon}): ${e.message}`);
      await sleep(1500);
    }
  }
  throw new Error(`(${lat}, ${lon}): still rate limited after several waits`);
}

const results = new Array(points.length);
let next = 0;
let done = 0;
async function worker() {
  while (next < points.length) {
    const i = next++;
    results[i] = await meansAt(points[i].lat, points[i].lon);
    if (++done % 50 === 0) console.log(`${done}/${points.length}`);
    await sleep(150);
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);

const round = (v) => (v === null ? null : Math.round(v * 1000) / 1000);
const out = {
  generatedAt: new Date().toISOString(),
  source: "NASA POWER T2M monthly, community RE, MERRA-2 based",
  step: grid.step,
  decades: DECADES,
  cells: points.map((p, i) => ({ lat: p.lat, lon: p.lon, state: p.state, v: results[i].map(round) })),
};
writeFileSync(path.join(root, "public/data/brazil-decades.json"), JSON.stringify(out) + "\n");
console.log(`wrote public/data/brazil-decades.json: ${out.cells.length} cells`);

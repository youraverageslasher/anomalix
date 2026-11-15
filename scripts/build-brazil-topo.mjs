/*
 * Anomalix: Brazil state topology (build:topo)
 * Source: brazil-states.geojson from the click_that_hood project (codeforamerica, public domain):
 *   https://raw.githubusercontent.com/codeforamerica/click_that_hood/main/public/data/brazil-states.geojson
 * Builds a TopoJSON topology so neighbouring states share the exact same border arcs, then
 * simplifies it with topology-aware simplification (borders stay shared, no gaps or overlaps).
 * Region outlines are dissolved at runtime from this topology with topojson-client merge().
 * Output: public/geo/brazil-states.topo.json (objects.states, properties: sigla, nome)
 * Usage: npm run build:topo
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { topology } from "topojson-server";
import { presimplify, simplify, quantile } from "topojson-simplify";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/main/public/data/brazil-states.geojson";
const local = process.argv[2];
const raw = local
  ? JSON.parse((await import("node:fs")).readFileSync(local, "utf8"))
  : await fetch(SRC).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
const states = {
  type: "FeatureCollection",
  features: raw.features.map((f) => ({
    type: "Feature",
    properties: { sigla: f.properties.sigla, nome: f.properties.name },
    geometry: f.geometry,
  })),
};
let topo = topology({ states }, 2e4);
topo = presimplify(topo);
topo = simplify(topo, quantile(topo, 0.02));
writeFileSync(path.join(root, "public/geo/brazil-states.topo.json"), JSON.stringify(topo));
console.log(`wrote public/geo/brazil-states.topo.json (${states.features.length} states)`);

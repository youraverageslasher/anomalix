"use client";

import { useState } from "react";
import type { MainData } from "./useReportData";
import type { Season } from "@/lib/data/types";
import { signed } from "@/lib/data/fmt";
import { VARIABLES, type VariableCode } from "@/lib/data/variables";
import { EXTREMES, POWER_END, POWER_ENDPOINT, POWER_START, powerUrl } from "@/lib/data/power";
import { GISTEMP_URL } from "@/lib/data/gistemp";
import { partialNote, periodText, spanOf } from "@/lib/data/range";

const UNIT_SLUG: Record<VariableCode, string> = { T2M: "c", PRECTOTCORR: "mm_per_day", RH2M: "percent", WS2M: "m_per_s" };

function csvFor(d: MainData, name: string, variable: VariableCode): string {
  const u = UNIT_SLUG[variable];
  const rows = [["year", `mean_${u}`, `anomaly_vs_1981_2010_${u}`]];
  const anom = new Map(d.analysis.anomalies.map((a) => [a.year, a.value]));
  for (const a of d.analysis.annual) rows.push([String(a.year), a.value.toFixed(4), (anom.get(a.year) ?? NaN).toFixed(4)]);
  const V = VARIABLES[variable];
  const t = d.analysis.trend;
  const mk = d.analysis.mk;
  const span = spanOf(d.analysis);
  const head = [
    `# ${name}, ${V.name} (${variable}, ${V.unit}), ${d.analysis.season === "ALL" ? "annual" : d.analysis.season} means`,
    `# Source: ${variable === "T2M" && name === "Global" ? "NASA GISS GISTEMP v4" : "NASA POWER, MERRA-2 based, monthly"}`,
    ...(span ? [`# Years in the trend: ${periodText(span, name === "Global" ? "gistemp" : "power")}, complete years only`] : []),
    ...(partialNote(d.coverage, span) ? [`# ${partialNote(d.coverage, span)}`] : []),
    `# OLS trend ${t.perDecade.toFixed(6)} ${V.unit} per decade, 95% CI +/- ${t.ci95PerDecade.toFixed(6)}, regression p ${t.p.toExponential(4)}`,
    `# Mann-Kendall S ${mk.s}, Z ${mk.z.toFixed(4)}, p ${mk.p.toExponential(4)}, Sen's slope ${mk.senPerDecade.toFixed(6)} ${V.unit} per decade`,
  ];
  return `${head.join("\n")}\n${rows.map((r) => r.join(",")).join("\n")}\n`;
}

function pythonFor(global: boolean, lat: number, lon: number, from: number, to: number, season: Season, variable: VariableCode): string {
  const V = VARIABLES[variable];
  const months =
    season === "ALL" ? "range(1, 13)" : { DJF: "[12, 1, 2]", MAM: "[3, 4, 5]", JJA: "[6, 7, 8]", SON: "[9, 10, 11]" }[season];
  const fetch = global
    ? `import pandas as pd
url = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
df = pd.read_csv(url, skiprows=1, na_values="***")
m = {}
for _, row in df.iterrows():
    for i, mo in enumerate(["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]):
        if pd.notna(row[mo]):
            m[(int(row["Year"]), i + 1)] = float(row[mo])`
    : `import requests
url = ("https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${variable}&community=RE"
       "&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&start=${POWER_START}&end=${POWER_END}&format=JSON")
raw = requests.get(url).json()["properties"]["parameter"]["${variable}"]
# skip the annual key (YYYY13) and the -999 fill value
m = {(int(k[:4]), int(k[4:])): v for k, v in raw.items() if not k.endswith("13") and v > -900}
full = {y for (y, _) in m if all((y, mo) in m for mo in range(1, 13))}
m = {k: v for k, v in m.items() if k[0] in full}`;
  return `${fetch}

import numpy as np, pymannkendall as mk
from scipy.stats import linregress
months = ${months}
years, means = [], []
for y in range(${from}, ${to} + 1):
    keys = [(y - 1, 12) if (mo == 12 and ${season === "DJF" ? "True" : "False"}) else (y, mo) for mo in months]
    if all(k in m for k in keys):
        years.append(y); means.append(np.mean([m[k] for k in keys]))
fit = linregress(years, means)
print(f"OLS trend: {fit.slope * 10:+.${V.digits}f} ${V.unit} per decade, regression p = {fit.pvalue:.3g}")
r = mk.original_test(means)
print(f"Mann-Kendall: Z = {r.z:.2f}, p = {r.p:.3g}, Sen's slope = {r.slope * 10:+.${V.digits}f} ${V.unit} per decade")
`;
}

const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function save(text: string, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* Everything behind the verdict in one file, read from the live analysis; nothing here is typed in. */
export function evidenceJson(d: MainData, o: { name: string; global: boolean; lat: number; lon: number; variable: VariableCode; season: Season }) {
  const V = VARIABLES[o.variable];
  const a = d.analysis;
  const t = a.trend;
  const span = spanOf(a);
  const cell = d.cell ?? null;
  const sources = o.global
    ? [GISTEMP_URL]
    : [cell ? powerUrl(cell.lat, cell.lon, o.variable) : POWER_ENDPOINT, ...(d.dayNight && cell ? [powerUrl(cell.lat, cell.lon, EXTREMES.join(","))] : [])];
  return {
    generatedBy: "Anomalix, Climate Detective",
    accessed: new Date().toISOString(),
    place: o.global ? "Global" : o.name,
    coordinates: o.global ? null : { lat: o.lat, lon: o.lon },
    powerCell: cell,
    variable: { code: o.variable, name: V.name, unit: V.unit },
    season: o.season,
    yearRange: span ? { from: span.from, to: span.to, completeYears: span.n } : null,
    coverage: d.coverage ?? null,
    ols: { slopePerDecade: t.perDecade, ci95HalfWidth: t.ci95PerDecade, ciLow: t.ciLow, ciHigh: t.ciHigh, p: t.p, df: t.df },
    theilSen: { slopePerDecade: a.mk.senPerDecade },
    mannKendall: { s: a.mk.s, z: a.mk.z, p: a.mk.p },
    autocorrelation: { r1: t.lag1, effectiveYears: t.nEff, pAdjusted: t.pAdj },
    residualSd: t.residualSd,
    acceleration: a.acceleration,
    verdict: d.verdict,
    dayNight: d.dayNight ?? null,
    annual: a.annual,
    sources,
  };
}

export function Reproduce({ variable = "T2M", d, name, global, lat, lon, from, to, season }: { variable?: VariableCode; d: MainData; name: string; global: boolean; lat: number; lon: number; from: number; to: number; season: Season }) {
  const V = VARIABLES[variable];
  const [copied, setCopied] = useState(false);
  const code = pythonFor(global, lat, lon, from, to, season, variable);

  function download() {
    const blob = new Blob([csvFor(d, global ? "Global" : name, variable)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anomalix-${(global ? "global" : name).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-")}-${variable.toLowerCase()}-${from}-${to}-${season.toLowerCase()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportEvidence() {
    const base = `anomalix-evidence-${slug(global ? "global" : name)}-${variable.toLowerCase()}`;
    save(csvFor(d, global ? "Global" : name, variable), "text/csv", `${base}.csv`);
    const json = JSON.stringify(evidenceJson(d, { name, global, lat, lon, variable, season }), null, 2);
    setTimeout(() => save(json, "application/json", `${base}.json`), 400);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the snippet:", code);
    }
  }

  return (
    <section aria-labelledby="reproduce" className="mx-auto mt-6 max-w-canvas px-5 md:px-side">
      <div className="flex flex-col gap-5 rounded-card border border-rule bg-card p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="max-w-[640px]">
          <h2 id="reproduce" className="font-serif text-figure text-text">Check our work</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-body">
            Download the {d.analysis.annual.length} yearly values behind this report, or copy a short Python script that pulls the same NASA data and
            should print {signed(d.analysis.trend.perDecade, V.digits)} {V.unit} per decade, plus the Mann-Kendall check.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={download} className="inline-flex h-[44px] items-center rounded-full border border-highlight-border px-5 text-[14px] font-medium text-text transition-colors hover:bg-highlight">
            Download CSV
          </button>
          <button
            onClick={exportEvidence}
            aria-label={`Export evidence for ${global ? "the global series" : name}: a CSV of yearly values and a JSON of every statistic and source`}
            className="inline-flex h-[44px] items-center rounded-full border border-highlight-border px-5 text-[14px] font-medium text-text transition-colors hover:bg-highlight"
          >
            Export evidence
          </button>
          <button onClick={copy} className="inline-flex h-[44px] items-center rounded-full bg-text px-5 text-[14px] font-semibold text-bg transition-colors hover:bg-white">
            {copied ? "Copied" : "Copy Python snippet"}
          </button>
        </div>
      </div>
    </section>
  );
}

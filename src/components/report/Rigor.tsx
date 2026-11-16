"use client";

import { fixed, pShort, signed } from "@/lib/data/fmt";
import { dayNightPattern, PATTERN_LINE, type ExtremeFit } from "@/lib/data/daynight";
import { dash } from "@/lib/data/range";
import { VARIABLES, type VariableCode } from "@/lib/data/variables";
import { ACCEL_YEARS } from "@/lib/data/rigor";
import type { MainData } from "./useReportData";
import { gistempName } from "@/lib/data/origin";

const pText = (p: number) => (pShort(p).startsWith("<") ? `p ${pShort(p)}` : `p = ${pShort(p)}`);

/* Extra rigor lines beside the headline: Theil-Sen, the autocorrelation adjusted p, and the recent pace. */
export function RigorRow({ d, variable }: { d: MainData; variable: VariableCode }) {
  const V = VARIABLES[variable];
  const t = d.analysis.trend;
  const acc = d.analysis.acceleration;
  const v = d.verdict;
  const du = `${V.unit}/decade`;
  const rows: [string, React.ReactNode][] = [
    [
      "Theil-Sen median slope",
      <>
        <span className="text-text">{signed(d.analysis.mk.senPerDecade, V.digits)}</span> {du} beside OLS {signed(t.perDecade, V.digits)} ·{" "}
        <span className={v.theilSenAgrees ? "text-muted" : "font-semibold text-text"}>{v.theilSenAgrees ? "inside the OLS interval" : "outside the OLS interval"}</span>
      </>,
    ],
    [
      "p adjusted for autocorrelation",
      <>
        <span className="text-text">{pText(t.pAdj)}</span> · lag 1 r = {fixed(t.lag1)} · effective years {fixed(t.nEff, 1)} of {d.analysis.annual.length}
      </>,
    ],
    [
      "Pace",
      acc ? (
        <>
          <span className="text-text">{acc.pace === "accelerating" ? "Accelerating" : acc.pace === "slowing" ? "Slowing" : "Steady"}</span>: last {acc.years} years ({acc.from}-{acc.to}){" "}
          {signed(acc.recent.perDecade, V.digits)} ± {fixed(acc.recent.halfWidth, V.digits)} against {signed(acc.full, V.digits)} {du} for the full series
        </>
      ) : (
        <>The series is too short to compare its last {ACCEL_YEARS} years with the whole.</>
      ),
    ],
  ];
  return (
    <div className="mt-3 rounded-card-sm border border-rule bg-card px-6 py-4">
      <p className="label">Extra rigor</p>
      <dl className="mt-3 grid grid-cols-1 gap-y-2">
        {rows.map(([k, val]) => (
          <div key={k} className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-[240px_1fr]">
            <dt className="text-[13px] text-muted">{k}</dt>
            <dd className="text-[14.5px] text-body tnum">{val}</dd>
          </div>
        ))}
      </dl>
      {v.downgradedBecause && (
        <p className="mt-3 border-t border-rule pt-3 text-[14px] font-semibold text-text">
          The regression alone would call this significant, but {v.downgradedBecause}, so the verdict stays Inconclusive.
        </p>
      )}
    </div>
  );
}

/* Signal: the size of the trend over the series. Noise: the typical year to year scatter around the line. */
export function SignalNoise({ d, variable, from, to, global = false }: { d: MainData; variable: VariableCode; from: number; to: number; global?: boolean }) {
  const V = VARIABLES[variable];
  const signal = Math.abs(d.analysis.trend.slopePerYear) * (to - from);
  const noise = d.analysis.trend.residualSd;
  const max = Math.max(signal, noise) || 1;
  const ratio = noise > 0 ? signal / noise : NaN;
  const sig = d.verdict.confidence !== "Inconclusive";
  const digits = V.digits >= 3 ? 3 : 2;
  const sentence = sig
    ? `Across ${from}-${to} the trend adds up to ${fixed(signal, digits)} ${V.unit}, ${Number.isFinite(ratio) ? `about ${fixed(ratio, 1)} times` : "well above"} the typical year to year noise of ${fixed(noise, digits)} ${V.unit}. The signal rises clearly above the noise, which is why the test can tell it apart from chance.`
    : `Across ${from}-${to} the trend adds up to ${fixed(signal, digits)} ${V.unit}, ${ratio < 1 ? "smaller than" : ratio < 2 ? "about the size of" : `about ${fixed(ratio, 1)} times`} the typical year to year noise of ${fixed(noise, digits)} ${V.unit}. ${ratio < 2 ? "The signal does not stand out from the noise, so chance cannot be ruled out." : "Even so, the tests cannot rule out chance with enough confidence, so the verdict stays Inconclusive."}`;
  const bar = (value: number, color: string, label: string) => (
    <div className="grid grid-cols-[64px_1fr_auto] items-center gap-3">
      <span className="text-[12.5px] text-muted">{label}</span>
      <span className="h-[12px] overflow-hidden rounded-full bg-track">
        <span className="block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700" style={{ width: `${Math.max(1, (value / max) * 100)}%`, background: color }} />
      </span>
      <span className="text-[13px] text-text tnum">
        {fixed(value, digits)} {V.unit}
      </span>
    </div>
  );
  return (
    <figure className="flex h-full flex-col rounded-card border border-rule bg-card p-6 shadow-card md:p-7">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-serif text-figure text-text">Signal vs noise</span>
        <span className="text-[12.5px] text-muted">same unit, {V.unit}</span>
      </figcaption>
      <div className="mt-5 flex flex-col gap-3" role="img" aria-label={`Signal ${fixed(signal, digits)} ${V.unit} against noise ${fixed(noise, digits)} ${V.unit}`}>
        {bar(signal, sig && V.temperature ? "#EF5A4C" : "#ECEEF1", "Signal")}
        {bar(noise, "#8D97A6", "Noise")}
      </div>
      <p className="mt-5 text-[14.5px] leading-relaxed text-body">{sentence}</p>
      <p className="mt-auto pt-4 text-[12px] text-muted">Signal: absolute trend times the years of the series. Noise: standard deviation of the yearly values around the line.</p>
      <p className="mt-2 text-[12px] text-muted">{global ? `${gistempName(d.origin)}, global monthly means.` : `NASA POWER ${V.code}, MERRA-2 based, monthly.`}</p>
    </figure>
  );
}

function ExtremeCell({ label, f }: { label: string; f: ExtremeFit }) {
  return (
    <div className="border-t border-rule pt-4">
      <p className="label">{label}</p>
      <p className="mt-2 font-serif text-[34px] leading-none text-text tnum">
        {signed(f.trend.perDecade)}
        <span className="ml-1.5 font-sans text-[12.5px] text-muted">°C/decade</span>
      </p>
      <p className="mt-2 text-[13px] text-body tnum">
        ± {fixed(f.trend.ci95PerDecade)} · {pText(f.trend.p)} · {f.verdict.confidence === "Inconclusive" ? "Inconclusive" : `${f.verdict.confidence} confidence`}
      </p>
      <p className="mt-1 text-[12px] text-muted">
        {f.code}
        {f.span ? `, ${dash(f.span)}, ${f.span.n} years` : ""}
      </p>
    </div>
  );
}

export function DaysNights({ data }: { data: NonNullable<MainData["dayNight"]> }) {
  if (!data.ok) {
    return (
      <figure className="rounded-card border border-rule bg-card p-6 shadow-card md:p-7">
        <figcaption className="font-serif text-figure text-text">Days vs nights</figcaption>
        <p role="status" className="mt-4 text-[14px] text-body">
          The daily maximum and minimum could not be loaded ({data.error}), so days and nights are not compared.
        </p>
      </figure>
    );
  }
  const pattern = dayNightPattern(data.max, data.min);
  return (
    <figure className="flex h-full flex-col rounded-card border border-rule bg-card p-6 shadow-card md:p-7">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="font-serif text-figure text-text">Days vs nights</span>
        <span className="text-[12.5px] text-muted">daily maximum and minimum</span>
      </figcaption>
      <div className="mt-4 grid grid-cols-2 gap-6">
        <ExtremeCell label="Days, T2M_MAX" f={data.max} />
        <ExtremeCell label="Nights, T2M_MIN" f={data.min} />
      </div>
      <p className={`mt-5 text-[14.5px] leading-relaxed ${pattern === "none" ? "text-body" : "font-semibold text-text"}`}>{PATTERN_LINE[pattern]}</p>
      <p className="mt-auto pt-4 text-[12px] text-muted">
        A pattern, not a cause. Each series keeps its own year range from NASA POWER, MERRA-2 based; a difference is named only when both trends are significant and the slopes differ by more than their combined intervals.
      </p>
    </figure>
  );
}

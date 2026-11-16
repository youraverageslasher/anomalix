"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchPill } from "@/components/ui/SearchPill";
import { CITY_MIN, MAX_YEAR, MIN_SPAN, SEASONS } from "@/components/report/params";
import { VARIABLES, readVariable, type VariableCode } from "@/lib/data/variables";
import { fixed, pLabel, signed } from "@/lib/data/fmt";
import { linkWarning, parsePlaceParam, placeParam } from "@/lib/data/pairCompare";
import type { PlacePairReport } from "@/lib/data/report";
import type { CityReport } from "@/lib/data/report";
import type { Season } from "@/lib/data/types";

type PlaceRef = { lat: number; lon: number; name: string };
type State = { status: "idle" } | { status: "loading" } | { status: "error"; error: string; code: string } | { status: "ready"; data: PlacePairReport };

function useCompareParams() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const params = useMemo(() => {
    let from = Number(sp.get("from") ?? CITY_MIN);
    let to = Number(sp.get("to") ?? MAX_YEAR);
    if (!Number.isInteger(from) || from < CITY_MIN || from > MAX_YEAR) from = CITY_MIN;
    if (!Number.isInteger(to) || to < CITY_MIN || to > MAX_YEAR) to = MAX_YEAR;
    if (to - from + 1 < MIN_SPAN) [from, to] = [CITY_MIN, MAX_YEAR];
    const s = (sp.get("season") ?? "ALL").toUpperCase() as Season;
    return {
      a: parsePlaceParam(sp.get("a")),
      b: parsePlaceParam(sp.get("b")),
      variable: readVariable(sp.get("variable")),
      from,
      to,
      season: SEASONS.some((x) => x.id === s) ? s : ("ALL" as Season),
    };
  }, [sp]);
  const update = (patch: Partial<typeof params>) => {
    const n = { ...params, ...patch };
    const q = new URLSearchParams();
    if (n.a) q.set("a", placeParam(n.a));
    if (n.b) q.set("b", placeParam(n.b));
    q.set("variable", n.variable);
    q.set("from", String(n.from));
    q.set("to", String(n.to));
    q.set("season", n.season);
    router.replace(`${pathname}?${q.toString()}`, { scroll: false });
  };
  return [params, update] as const;
}

function reportLink(p: PlaceRef, variable: VariableCode, from: number, to: number, season: Season) {
  const q = new URLSearchParams({ lat: p.lat.toFixed(4), lon: p.lon.toFixed(4), name: p.name, variable, from: String(from), to: String(to), season });
  return `/report?${q.toString()}`;
}

function Summary({ label, place, r, variable, href }: { label: string; place: PlaceRef; r: CityReport; variable: VariableCode; href: string }) {
  const V = VARIABLES[variable];
  const t = r.analysis.trend;
  return (
    <article className="rounded-card border border-rule bg-card p-6 shadow-card">
      <p className="label">{label}</p>
      <h2 className="mt-2 font-serif text-[28px] font-medium leading-tight text-text">{place.name}</h2>
      <p className="mt-4 font-serif text-[44px] font-medium leading-none text-text tnum">{signed(t.perDecade, V.digits)}</p>
      <p className="mt-1 text-[13px] text-muted">{V.unit} per decade</p>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[14px]">
        <dt className="text-muted">95% interval</dt>
        <dd className="text-text tnum">± {fixed(t.ci95PerDecade, V.digits)}</dd>
        <dt className="text-muted">Standard error</dt>
        <dd className="text-text tnum">{fixed(t.se * 10, V.digits)}</dd>
        <dt className="text-muted">Regression</dt>
        <dd className="text-text tnum">{pLabel(t.p)}</dd>
        <dt className="text-muted">Verdict</dt>
        <dd className="text-text">{r.verdict.confidence}</dd>
      </dl>
      <Link href={href} className="mt-5 inline-block text-[13.5px] text-text underline underline-offset-4">
        Open the full report
      </Link>
    </article>
  );
}

function ComparisonBlock({ d, a, b, variable }: { d: PlacePairReport; a: PlaceRef; b: PlaceRef; variable: VariableCode }) {
  const V = VARIABLES[variable];
  const c = d.comparison;
  return (
    <section aria-labelledby="cmp" className="rounded-card border-2 border-text bg-card p-6 shadow-card md:p-8">
      <p className="label">The comparison</p>
      <h2 id="cmp" className="mt-2 font-serif text-[30px] font-medium leading-tight text-text">
        {c.significant ? "The difference is statistically significant." : "The difference is not statistically significant."}
      </h2>
      <p className="mt-4 font-serif text-[40px] font-medium leading-none text-text tnum">
        {signed(c.delta, V.digits)} <span className="text-[22px] text-body">± {fixed(c.half95, V.digits)}</span>
      </p>
      <p className="mt-1 text-[13px] text-muted">
        {V.unit} per decade, {a.name} minus {b.name}, 95% range (1.96 × standard error)
      </p>
      <p className="mt-4 text-[14.5px] leading-relaxed text-body tnum">
        z = {fixed(c.z, 2)} · {pLabel(c.p)} (two-tailed) · standard error of the difference {fixed(c.seDelta, V.digits)} = √(seA² + seB²) · {d.years.length} shared years, {d.years[0]}-
        {d.years[d.years.length - 1]}
      </p>
      {d.linked ? (
        <p role="alert" className="mt-5 rounded-card-sm border border-text bg-highlight px-4 py-3 text-[14.5px] font-semibold leading-relaxed text-text">
          {linkWarning(d.r)}
        </p>
      ) : (
        <p className="mt-5 text-[13.5px] leading-relaxed text-body">
          Correlation of the yearly anomalies: r = {Number.isFinite(d.r) ? d.r.toFixed(2) : "n/a"}. The series are not strongly linked, so treating the two slopes as independent is reasonable.
        </p>
      )}
      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        The z test assumes the two slope estimates are independent. It compares rates, not causes. Both sides use the same variable, period, season and years.
      </p>
    </section>
  );
}

export function ComparePage() {
  const [p, update] = useCompareParams();
  const [state, setState] = useState<State>({ status: "idle" });
  const [pickB, setPickB] = useState(false);
  const V = VARIABLES[p.variable];
  const years = Array.from({ length: MAX_YEAR - CITY_MIN + 1 }, (_, i) => CITY_MIN + i);

  useEffect(() => {
    if (!p.a || !p.b) return setState({ status: "idle" });
    const ctrl = new AbortController();
    setState({ status: "loading" });
    const q = new URLSearchParams({ a: placeParam(p.a), b: placeParam(p.b), variable: p.variable, start: String(p.from), end: String(p.to), season: p.season });
    fetch(`/api/pair?${q.toString()}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        setState(r.ok ? { status: "ready", data: j } : { status: "error", error: j.error ?? `The comparison failed (${r.status})`, code: j.code ?? "data" });
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setState({ status: "error", error: `The comparison did not respond. ${e instanceof Error ? e.message : ""}`.trim(), code: "data" });
      });
    return () => ctrl.abort();
  }, [p.a?.lat, p.a?.lon, p.a?.name, p.b?.lat, p.b?.lon, p.b?.name, p.variable, p.from, p.to, p.season]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = "h-[40px] rounded-full border border-rule bg-card px-4 text-[14px] text-text";
  return (
    <main id="main" className="mx-auto w-full max-w-canvas px-5 pb-24 pt-10 md:px-side">
      <p className="label">Side by side</p>
      <h1 className="mt-3 font-serif text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-text md:text-[56px]">Compare two places</h1>
      <p className="mt-3 max-w-[680px] text-[15px] leading-relaxed text-body">
        Same NASA POWER variable, period and season for both places, on the years they share. Then one question: are the two trends really different?
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="cmp-var">Variable</label>
        <select id="cmp-var" className={select} value={p.variable} onChange={(e) => update({ variable: readVariable(e.target.value) })}>
          {Object.values(VARIABLES).map((v) => (
            <option key={v.code} value={v.code}>
              {v.short} ({v.code})
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="cmp-from">From</label>
        <select id="cmp-from" className={select} value={p.from} onChange={(e) => update({ from: Number(e.target.value) })}>
          {years.filter((y) => y <= p.to - MIN_SPAN + 1).map((y) => (
            <option key={y} value={y}>
              From {y}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="cmp-to">To</label>
        <select id="cmp-to" className={select} value={p.to} onChange={(e) => update({ to: Number(e.target.value) })}>
          {years.filter((y) => y >= p.from + MIN_SPAN - 1).map((y) => (
            <option key={y} value={y}>
              To {y}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="cmp-season">Season</label>
        <select id="cmp-season" className={select} value={p.season} onChange={(e) => update({ season: e.target.value as Season })}>
          {SEASONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {!p.a ? (
        <section className="mt-8">
          <p className="mb-3 text-[15px] text-text">Pick the first place</p>
          <SearchPill onPick={(x) => update({ a: { lat: x.lat, lon: x.lon, name: x.nome } })} />
        </section>
      ) : !p.b || pickB ? (
        <section className="mt-8">
          <p className="mb-3 text-[15px] text-text">
            Compare <span className="font-semibold">{p.a.name}</span> with another place
          </p>
          <SearchPill
            onPick={(x) => {
              setPickB(false);
              update({ b: { lat: x.lat, lon: x.lon, name: x.nome } });
            }}
          />
        </section>
      ) : (
        <div className="mt-6 flex flex-wrap gap-3 text-[13.5px]">
          <button onClick={() => setPickB(true)} className="rounded-full border border-highlight-border px-4 py-2 text-text hover:bg-highlight">
            Change the second place
          </button>
          <button onClick={() => update({ a: p.b, b: p.a })} className="rounded-full border border-highlight-border px-4 py-2 text-text hover:bg-highlight">
            Swap sides
          </button>
        </div>
      )}

      {state.status === "loading" && <p className="mt-10 text-[15px] text-body" aria-live="polite">Fetching both series from NASA POWER…</p>}

      {state.status === "error" && (
        <section role="status" className="mt-10 rounded-card border border-rule bg-card p-6 shadow-card">
          <p className="label">{state.code === "same-cell" ? "Same grid cell" : "Comparison not available"}</p>
          <p className="mt-2 font-serif text-[24px] text-text">{state.code === "same-cell" ? "These two places share one data series." : "We could not compare these places."}</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-body">{state.error}</p>
          <button onClick={() => setPickB(true)} className="mt-4 rounded-full bg-text px-5 py-2 text-[14px] font-semibold text-bg">
            Pick another place
          </button>
        </section>
      )}

      {state.status === "ready" && p.a && p.b && (
        <>
          <div className="mt-10">
            <ComparisonBlock d={state.data} a={p.a} b={p.b} variable={p.variable} />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <Summary label="Place A" place={p.a} r={state.data.a} variable={p.variable} href={reportLink(p.a, p.variable, p.from, p.to, p.season)} />
            <Summary label="Place B" place={p.b} r={state.data.b} variable={p.variable} href={reportLink(p.b, p.variable, p.from, p.to, p.season)} />
          </div>
          <p className="mt-6 text-[12px] text-muted">
            Data source: NASA POWER {V.code}, MERRA-2 based, monthly, {state.data.years[0]}-{state.data.years[state.data.years.length - 1]}, shared years only.
          </p>
        </>
      )}
    </main>
  );
}

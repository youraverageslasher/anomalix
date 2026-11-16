"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReportParams } from "@/components/report/params";
import { useLoad, type MainData } from "@/components/report/useReportData";
import { CARD_H, CARD_W, drawCard, ensureCardFonts, type CardInput } from "@/lib/card";
import { resolveSearch } from "@/lib/useSearchedPlace";
import { VARIABLES, directionWord } from "@/lib/data/variables";
import { aboutRatio, agreement, alignTwoSources } from "@/lib/data/twoSource";
import { spanOf } from "@/lib/data/range";

function slug(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const btn = "inline-flex h-[44px] items-center rounded-full px-6 text-[15px]";

function Message({ kicker, title, body, children }: { kicker: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] flex-col justify-center gap-5">
      <p className="label">{kicker}</p>
      <h1 className="font-serif text-[40px] leading-tight text-text">{title}</h1>
      <p className="max-w-[540px] text-[16px] leading-relaxed text-body">{body}</p>
      {children}
    </div>
  );
}

/* The planet rate is recomputed on the shared years; the ratio appears only when the local trend is significant. */
function planetLine(d: MainData, g: MainData | null): CardInput["planet"] {
  if (!g) return null;
  const two = alignTwoSources(d.analysis.annual, g.analysis.annual);
  if (!two) return null;
  const ag = agreement(two.local, two.global);
  const line =
    two.local.verdict.confidence === "Inconclusive"
      ? "Not enough evidence to compare."
      : ag.kind === "same" && ag.ratio !== null
        ? `Local rate ${aboutRatio(ag.ratio)} times the planet's.`
        : "The directions do not agree.";
  return { perDecade: two.global.trend.perDecade, ci: two.global.trend.ci95PerDecade, line };
}

export function CardView() {
  const [p] = useReportParams();
  const search = useMemo(() => resolveSearch(!p.global && p.valid ? { name: p.name || "This place", lat: p.lat, lon: p.lon, cc: p.cc, admin1: p.admin1 } : null), [p.global, p.valid, p.name, p.lat, p.lon, p.cc, p.admin1]);
  const q = `start=${p.from}&end=${p.to}&season=${p.season}`;
  const main = useLoad<MainData>(p.valid && !p.global ? `/api/report?lat=${p.lat.toFixed(4)}&lon=${p.lon.toFixed(4)}&name=${encodeURIComponent(p.name)}&${q}&variable=${p.variable}&extras=0` : null);
  const planet = useLoad<MainData>(p.valid && !p.global && p.variable === "T2M" ? `/api/global?${q}` : null);
  const sp = useSearchParams();
  const reportUrl = `/report?${sp.toString()}`;

  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const d = main.status === "ready" ? main.data : null;
  const input: CardInput | null = useMemo(
    () =>
      d
        ? {
            name: p.name || "This place",
            line: search.line,
            lat: p.lat,
            lon: p.lon,
            from: spanOf(d.analysis)?.from ?? d.analysis.startYear,
            to: spanOf(d.analysis)?.to ?? d.analysis.endYear,
            analysis: d.analysis,
            verdict: d.verdict,
            planet: planetLine(d, planet.status === "ready" ? planet.data : null),
            variable: p.variable,
          }
        : null,
    [d, p.name, p.lat, p.lon, search.line, planet, p.variable],
  );

  useEffect(() => {
    if (!input) return;
    let alive = true;
    setReady(false);
    ensureCardFonts().then(() => {
      const ctx = ref.current?.getContext("2d");
      if (!alive || !ctx) return;
      drawCard(ctx, input, window.location.host || "anomalix");
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [input]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy the link:", window.location.href);
    }
  }
  function download() {
    ref.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `anomalix-${slug(p.name) || "card"}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }

  let body: React.ReactNode;
  if (!p.valid || p.global)
    body = (
      <Message kicker="No place chosen" title="The card needs a city." body="This link does not name a point to analyze. Search for a city and create the card from its report.">
        <Link href="/" className={`${btn} w-fit bg-text font-medium text-bg hover:bg-white`}>
          Search a city
        </Link>
      </Message>
    );
  else if (main.status === "error")
    body = (
      <Message kicker="NASA POWER did not answer" title={p.name} body={`${main.error}. We never draw a card from guessed numbers.`}>
        <Link href={reportUrl} className={`${btn} w-fit border border-highlight-border text-text hover:bg-highlight`}>
          Back to the report
        </Link>
      </Message>
    );
  else if (main.status === "loading")
    body = (
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,540px)_1fr]">
        <div className="aspect-[4/5] w-full animate-pulse rounded-card-sm bg-card" />
        <Message kicker="Asking NASA" title={p.name} body="Fetching the monthly record and running the test." />
      </div>
    );
  else
    body = (
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,540px)_1fr]">
        <div className="overflow-hidden rounded-card-sm border border-rule">
          <canvas ref={ref} width={CARD_W} height={CARD_H} className="block h-auto w-full" role="img" aria-label={`Share card for ${p.name}: ${d ? `${d.verdict.confidence === "Inconclusive" ? "inconclusive" : directionWord(p.variable, d.verdict.direction).toLowerCase()}, ${d.analysis.trend.perDecade.toFixed(VARIABLES[p.variable].digits)} ${VARIABLES[p.variable].change} per decade` : ""}`} />
        </div>
        <div className="flex flex-col justify-center gap-5">
          <p className="label">Share card · 1080 × 1350</p>
          <h1 className="font-serif text-[40px] leading-tight text-text">{p.name}</h1>
          <p className="max-w-[460px] text-[16px] leading-relaxed text-body">
            Drawn in your browser from the same live analysis as the report, for the period and season you chose.
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={download} disabled={!ready} className={`${btn} bg-text font-medium text-bg hover:bg-white disabled:opacity-60`}>
              Download image
            </button>
            <button onClick={copyLink} className={`${btn} border border-highlight-border text-text hover:bg-highlight`}>
              {copied ? "Link copied" : "Copy link"}
            </button>
            <Link href={reportUrl} className={`${btn} border border-highlight-border text-text hover:bg-highlight`}>
              Back to the report
            </Link>
          </div>
        </div>
      </div>
    );

  return <main className="mx-auto w-full max-w-canvas flex-1 px-5 pb-16 pt-12 md:px-side">{body}</main>;
}

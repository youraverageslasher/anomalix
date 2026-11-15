"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath, type GeoProjection } from "d3-geo";
import { brazilOutline, brazilStates } from "@/components/v6/geo";
import { usePrefersReducedMotion } from "@/components/v6/motion";
import { colorFor } from "@/lib/data/color";
import { signed } from "@/lib/data/fmt";
import { availableDecades, cellAnomaly, meanAnomaly, BASELINE_DECADE, type DecadeCell, type DecadeGrid } from "@/lib/data/decades";
import raw from "../../../public/data/brazil-decades.json";

const GRID = raw as DecadeGrid;
const STEP_MS = 2200;
const FADE_MS = 700;
const COUNT_MS = 900;
const EMPTY = "#323A46";
const EMPTY_RGB: RGB = [0x32, 0x3a, 0x46];
type RGB = [number, number, number];

const hexRgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (k: number) => `${GRID.decades[k].from}-${GRID.decades[k].to}`;
const fmt = (v: number) => `${signed(v)} °C`;

/* Everything below is derived once from the real grid file; nothing is typed in by hand. */
const FRAMES = availableDecades(GRID);
const CELLS = GRID.cells;
const BASE = GRID.decades[BASELINE_DECADE];
const NATIONAL = FRAMES.map((k) => meanAnomaly(CELLS, k));
const MAX_ABS = (() => {
  let m = 0;
  for (const k of FRAMES) for (const c of CELLS) {
    const a = cellAnomaly(c, k);
    if (a !== null) m = Math.max(m, Math.abs(a));
  }
  return Math.max(0.1, Math.ceil(m * 10) / 10);
})();
/* Diverging scale fixed across all frames: zero is the neutral middle of the ramp, plus or minus MAX_ABS its ends. */
const toColor = (a: number | null) => (a === null ? EMPTY : colorFor(0.375 + Math.max(-1, Math.min(1, a / MAX_ABS)) * 0.375));
const FRAME_RGB: RGB[][] = FRAMES.map((k) => CELLS.map((c) => (cellAnomaly(c, k) === null ? EMPTY_RGB : hexRgb(toColor(cellAnomaly(c, k))))));
/* The cells form a regular lat-lon lattice, so each frame is painted as a tiny image, one pixel per cell, then stretched row by row onto the map. */
const LAT_MAX = Math.max(...CELLS.map((c) => c.lat));
const LON_MIN = Math.min(...CELLS.map((c) => c.lon));
const ROWS = Math.round((LAT_MAX - Math.min(...CELLS.map((c) => c.lat))) / GRID.step) + 1;
const COLS = Math.round((Math.max(...CELLS.map((c) => c.lon)) - LON_MIN) / GRID.step) + 1;
const PIXEL = CELLS.map((c) => Math.round((LAT_MAX - c.lat) / GRID.step) * COLS + Math.round((c.lon - LON_MIN) / GRID.step));
const CELL_INDEX = new Map(CELLS.map((c, i) => [`${c.lat},${c.lon}`, i]));
const STATE_NAMES = Object.fromEntries(brazilStates().map((f) => [f.properties.sigla, f.properties.nome]));
const STATE_MEANS: Record<string, number | null>[] = FRAMES.map((k) => {
  const acc: Record<string, [number, number]> = {};
  for (const c of CELLS) {
    const a = cellAnomaly(c, k);
    if (a === null) continue;
    const s = (acc[c.state] ??= [0, 0]);
    s[0] += a;
    s[1]++;
  }
  return Object.fromEntries(Object.entries(acc).map(([s, [sum, n]]) => [s, sum / n]));
});
const FULL = FRAMES.filter((k) => !GRID.decades[k].partial);
const FIRST_FULL = FULL[0];
const LAST_FULL = FULL[FULL.length - 1];
const SUMMARY = (() => {
  if (FIRST_FULL === undefined || LAST_FULL === undefined || FIRST_FULL === LAST_FULL) return null;
  const i = FRAMES.indexOf(LAST_FULL);
  let up = 0;
  let n = 0;
  for (const c of CELLS) {
    const a = cellAnomaly(c, LAST_FULL);
    if (a === null) continue;
    n++;
    if (a > 0) up++;
  }
  return { change: NATIONAL[i].mean, up, n, from: GRID.decades[FIRST_FULL].label, to: GRID.decades[LAST_FULL].label };
})();
const PARTIAL = FRAMES.map((k) => GRID.decades[k]).find((d) => d.partial) ?? null;

interface Geo {
  projection: GeoProjection;
  rows: Float32Array;
  x0: number;
  x1: number;
  states: { sigla: string; path: Path2D }[];
  clip: string;
  borders: HTMLCanvasElement;
  tiny: HTMLCanvasElement;
  img: ImageData;
  w: number;
  h: number;
  dpr: number;
}

function layer(w: number, h: number, dpr: number, paint: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const ctx = c.getContext("2d");
  if (ctx) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paint(ctx);
  }
  return c;
}

function buildGeo(width: number, dpr: number): Geo {
  const outlineF = brazilOutline();
  const probe = geoMercator().fitWidth(width, outlineF);
  const b = geoPath(probe).bounds(outlineF);
  const h = Math.ceil(b[1][1] - b[0][1]);
  const projection = geoMercator().fitExtent(
    [
      [2, 2],
      [width - 2, h - 2],
    ],
    outlineF,
  );
  const path = geoPath(projection);
  const half = GRID.step / 2;
  const rows = new Float32Array(ROWS * 2);
  for (let r = 0; r < ROWS; r++) {
    const lat = LAT_MAX - r * GRID.step;
    rows[r * 2] = (projection([LON_MIN, lat + half]) ?? [0, 0])[1];
    rows[r * 2 + 1] = (projection([LON_MIN, lat - half]) ?? [0, 0])[1];
  }
  const x0 = (projection([LON_MIN - half, 0]) ?? [0, 0])[0];
  const x1 = (projection([LON_MIN + (COLS - 1) * GRID.step + half, 0]) ?? [0, 0])[0];
  const clip = path(outlineF) ?? "";
  const outline = new Path2D(clip);
  const states = brazilStates().map((f) => ({ sigla: f.properties.sigla, path: new Path2D(path(f) ?? "") }));
  const borders = layer(width, h, dpr, (ctx) => {
    ctx.lineJoin = "round";
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "rgba(13,16,21,0.55)";
    for (const s of states) ctx.stroke(s.path);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#3B4656";
    ctx.stroke(outline);
  });
  const tiny = document.createElement("canvas");
  tiny.width = COLS;
  tiny.height = ROWS;
  const img = new ImageData(COLS, ROWS);
  for (let i = 0; i < COLS * ROWS; i++) img.data.set([...EMPTY_RGB, 255], i * 4);
  return { projection, rows, x0, x1, states, clip, borders, tiny, img, w: width, h, dpr };
}

export function DecadesFilm({ figure }: { figure: number }) {
  const reduced = usePrefersReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const meanRef = useRef<HTMLSpanElement>(null);
  const geo = useRef<Geo | null>(null);
  const anim = useRef({ from: 0, to: 0, t0: 0, fading: false, shownMean: 0, meanFrom: 0, lastStep: 0, raf: 0, hoverState: null as string | null, pointer: null as [number, number] | null });
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const frameRef = useRef(0);
  const playingRef = useRef(false);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const draw = useCallback((mix: number) => {
    const g = geo.current;
    const cv = canvas.current;
    if (!g || !cv) return;
    const ctx = cv.getContext("2d");
    const tctx = g.tiny.getContext("2d");
    if (!ctx || !tctx) return;
    const { from, to } = anim.current;
    const A = FRAME_RGB[from];
    const B = FRAME_RGB[to];
    const px = g.img.data;
    for (let i = 0; i < A.length; i++) {
      const a = A[i];
      const b = B[i];
      const o = PIXEL[i] * 4;
      px[o] = a[0] + (b[0] - a[0]) * mix;
      px[o + 1] = a[1] + (b[1] - a[1]) * mix;
      px[o + 2] = a[2] + (b[2] - a[2]) * mix;
    }
    tctx.putImageData(g.img, 0, 0);
    ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
    ctx.clearRect(0, 0, g.w, g.h);
    ctx.imageSmoothingEnabled = false;
    const r = g.rows;
    for (let row = 0; row < ROWS; row++) ctx.drawImage(g.tiny, 0, row, COLS, 1, g.x0, r[row * 2] - 0.3, g.x1 - g.x0, r[row * 2 + 1] - r[row * 2] + 0.6);
  }, []);

  /* Borders and the hovered state live on a second canvas that is repainted only on resize or hover, never during the fade. */
  const drawOverlay = useCallback(() => {
    const g = geo.current;
    const cv = overlay.current;
    const ctx = cv?.getContext("2d");
    if (!g || !cv || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(g.borders, 0, 0);
    const hs = anim.current.hoverState;
    const s = hs ? g.states.find((x) => x.sigla === hs) : null;
    if (s) {
      ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
      ctx.lineJoin = "round";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ECEEF1";
      ctx.stroke(s.path);
    }
  }, []);

  const writeMean = (v: number) => {
    if (meanRef.current) meanRef.current.textContent = fmt(v);
  };

  const updateTip = useCallback(() => {
    const el = tip.current;
    const g = geo.current;
    const p = anim.current.pointer;
    if (!el || !g) return;
    if (!p) {
      el.style.opacity = "0";
      if (anim.current.hoverState) {
        anim.current.hoverState = null;
        drawOverlay();
      }
      return;
    }
    const ll = g.projection.invert?.(p);
    const k = frameRef.current;
    let cellLine = "";
    let sigla: string | null = null;
    if (ll) {
      const lat = Math.floor(ll[1]) + 0.5;
      const lon = Math.floor(ll[0]) + 0.5;
      const i = CELL_INDEX.get(`${lat},${lon}`);
      if (i !== undefined) {
        const c = CELLS[i];
        sigla = c.state;
        const a = cellAnomaly(c, FRAMES[k]);
        cellLine = `Cell ${Math.abs(lat).toFixed(1)}° ${lat < 0 ? "S" : "N"}, ${Math.abs(lon).toFixed(1)}° W: ${a === null ? "no data" : fmt(a)}`;
      }
    }
    if (!sigla) {
      el.style.opacity = "0";
      if (anim.current.hoverState) {
        anim.current.hoverState = null;
        drawOverlay();
      }
      return;
    }
    const sm = STATE_MEANS[k][sigla];
    el.innerHTML = `<p class="font-semibold text-text">${STATE_NAMES[sigla] ?? sigla} · ${GRID.decades[FRAMES[k]].label}</p><p class="mt-1 tnum">State mean: ${sm === null || sm === undefined ? "no data" : fmt(sm)}</p><p class="tnum text-muted">${cellLine}</p>`;
    const x = Math.min(p[0] + 14, g.w - 230);
    const y = Math.max(p[1] - 70, 0);
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    el.style.opacity = "1";
    if (anim.current.hoverState !== sigla) {
      anim.current.hoverState = sigla;
      drawOverlay();
    }
  }, [drawOverlay]);

  const goTo = useCallback(
    (next: number, now = performance.now()) => {
      const s = anim.current;
      const prev = frameRef.current;
      if (next === prev && !s.fading) return;
      s.from = s.fading ? s.to : prev;
      s.to = next;
      s.meanFrom = s.shownMean;
      s.t0 = now;
      frameRef.current = next;
      setFrame(next);
      if (reducedRef.current) {
        s.from = next;
        s.fading = false;
        s.shownMean = NATIONAL[next].mean;
        writeMean(s.shownMean);
        draw(1);
      } else {
        s.fading = true;
      }
      updateTip();
    },
    [draw, updateTip],
  );

  /* One requestAnimationFrame loop drives the cross fade, the count-up and the playback clock. React renders only once per decade. */
  useEffect(() => {
    const loop = (now: number) => {
      const s = anim.current;
      if (s.fading) {
        const k = Math.min(1, (now - s.t0) / FADE_MS);
        draw(ease(k));
        const m = Math.min(1, (now - s.t0) / COUNT_MS);
        s.shownMean = s.meanFrom + (NATIONAL[s.to].mean - s.meanFrom) * ease(m);
        writeMean(s.shownMean);
        if (k >= 1 && m >= 1) {
          s.fading = false;
          s.from = s.to;
        }
      }
      if (playingRef.current && now - s.lastStep >= STEP_MS) {
        const next = frameRef.current + 1;
        if (next < FRAMES.length) {
          s.lastStep = now;
          goTo(next, now);
        }
        if (next >= FRAMES.length - 1) {
          playingRef.current = false;
          setPlaying(false);
        }
      }
      s.raf = requestAnimationFrame(loop);
    };
    const s0 = anim.current;
    s0.raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(s0.raf);
  }, [draw, goTo]);

  useEffect(() => {
    const el = wrap.current;
    const cv = canvas.current;
    const ov = overlay.current;
    if (!el || !cv || !ov) return;
    const resize = () => {
      const w = Math.round(el.clientWidth);
      if (!w) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const g = buildGeo(w, dpr);
      geo.current = g;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(g.h * dpr);
      cv.style.width = `${w}px`;
      cv.style.height = `${g.h}px`;
      cv.style.clipPath = `path("${g.clip}")`;
      ov.width = cv.width;
      ov.height = cv.height;
      ov.style.width = `${w}px`;
      ov.style.height = `${g.h}px`;
      draw(anim.current.fading ? 0 : 1);
      drawOverlay();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw, drawOverlay]);

  const play = useCallback(() => {
    const now = performance.now();
    if (frameRef.current >= FRAMES.length - 1) {
      anim.current.shownMean = 0;
      goTo(0, now);
    }
    anim.current.lastStep = now;
    playingRef.current = true;
    setPlaying(true);
    setStarted(true);
  }, [goTo]);

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
  }, []);

  /* Autoplay once, when the film scrolls into view; never with reduced motion. */
  useEffect(() => {
    writeMean(NATIONAL[0].mean);
    anim.current.shownMean = NATIONAL[0].mean;
    if (reduced) return;
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && e.intersectionRatio > 0.55) {
          io.disconnect();
          play();
        }
      },
      { threshold: [0, 0.55, 0.8] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced, play]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      if (reduced) return;
      if (playing) pause();
      else play();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      pause();
      goTo(Math.min(FRAMES.length - 1, frameRef.current + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      pause();
      goTo(Math.max(0, frameRef.current - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      pause();
      goTo(0);
    } else if (e.key === "End") {
      e.preventDefault();
      pause();
      goTo(FRAMES.length - 1);
    }
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    anim.current.pointer = [e.clientX - r.left, e.clientY - r.top];
    updateTip();
  };
  const onLeave = () => {
    anim.current.pointer = null;
    updateTip();
  };

  const d = GRID.decades[FRAMES[frame]];
  const atEnd = frame === FRAMES.length - 1;
  const legendTicks = useMemo(() => [-MAX_ABS, -MAX_ABS / 2, 0, MAX_ABS / 2, MAX_ABS], []);
  const gradient = useMemo(() => `linear-gradient(90deg, ${Array.from({ length: 11 }, (_, i) => toColor(-MAX_ABS + (2 * MAX_ABS * i) / 10)).join(",")})`, []);

  return (
    <figure
      aria-labelledby="decades-title"
      className="overflow-hidden rounded-card border border-rule bg-card shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-text/60"
      tabIndex={0}
      onKeyDown={onKey}
      aria-describedby="decades-help"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        <div className="flex flex-col justify-between gap-8 border-b border-rule p-6 md:p-9 lg:border-b-0 lg:border-r">
          <div>
            <p className="label">
              <span className="text-text">Figure {figure}</span> · Decade by decade
            </p>
            <h3 id="decades-title" className="mt-4 font-serif text-[30px] leading-[1.05] tracking-[-0.02em] text-text md:text-[38px]">
              Four decades of Brazil, one cell at a time
            </h3>
            <div className="mt-10" aria-live="polite">
              <p className="flex items-start gap-3 font-serif text-[76px] leading-[0.9] tracking-[-0.04em] text-text md:text-[112px]">
                {d.partial ? d.label.replace(/ so far$/, "") : d.label}
                {d.partial && <span className="mt-3 rounded-full border border-highlight-border px-3 py-1 font-sans text-[12px] font-semibold uppercase tracking-[0.12em] text-body md:mt-5">So far</span>}
              </p>
              <p className="mt-3 text-[14px] text-muted tnum">
                {span(FRAMES[frame])}
                {d.partial ? ", a partial period of complete years" : ""}
              </p>
            </div>
            <div className="mt-8 border-t border-rule pt-5">
              <p className="font-serif text-[44px] leading-none tracking-[-0.02em] text-text tnum md:text-[52px]">
                <span ref={meanRef} aria-hidden>
                  {fmt(NATIONAL[0].mean)}
                </span>
                <span className="sr-only">{fmt(NATIONAL[frame].mean)}</span>
              </p>
              <p className="mt-2 text-[13.5px] text-muted">
                National mean against the {BASE.label} ({span(BASELINE_DECADE)}), from {NATIONAL[frame].count} cells
              </p>
            </div>
          </div>
          {SUMMARY && (
            <p className="text-[15px] leading-relaxed text-body">
              From the {SUMMARY.from} to the {SUMMARY.to}, the national mean of the grid changed by{" "}
              <span className="text-text tnum">{fmt(SUMMARY.change)}</span>, and {SUMMARY.up} of {SUMMARY.n} cells ended warmer than they began.
            </p>
          )}
        </div>

        <div className="p-4 md:p-7">
          <div ref={wrap} className="relative">
            <canvas
              ref={canvas}
              role="img"
              aria-label={`Map of Brazil on a 1 degree grid, ${d.label}: each cell colored by its mean temperature against the ${BASE.label}. National mean ${fmt(NATIONAL[frame].mean)}.`}
              onPointerMove={onMove}
              onPointerLeave={onLeave}
              className="block touch-none"
              style={{ background: EMPTY }}
            />
            <canvas ref={overlay} aria-hidden className="pointer-events-none absolute left-0 top-0" />
            <div
              ref={tip}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 w-[220px] rounded-[10px] border border-highlight-border bg-highlight px-3 py-2 text-[12.5px] leading-snug text-body opacity-0 shadow-float"
              style={{ transition: "opacity 120ms linear", willChange: "transform" }}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div className="w-full max-w-[300px]">
              <p className="text-[12.5px] font-medium text-text">°C against the {span(BASELINE_DECADE)} baseline, same scale in every frame</p>
              <div className="mt-2 h-[10px] rounded-[3px]" style={{ background: gradient }} role="img" aria-label={`Color scale from ${fmt(-MAX_ABS)} to ${fmt(MAX_ABS)}, blue to red`} />
              <div className="mt-1 flex justify-between text-[11.5px] text-muted tnum">
                {legendTicks.map((t) => (
                  <span key={t}>{t === 0 ? "0" : signed(t, MAX_ABS < 1 ? 2 : 1)}</span>
                ))}
              </div>
            </div>
            <p className="flex items-center gap-2 text-[12.5px] text-muted">
              <span aria-hidden className="inline-block h-[10px] w-[16px] rounded-[2px]" style={{ background: EMPTY }} />
              No data or no grid cell
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-rule px-6 py-5 md:px-9">
        <div className="flex items-center gap-4 md:gap-6">
          {!reduced && (
            <button
              type="button"
              onClick={playing ? pause : play}
              aria-label={playing ? "Pause the decade animation" : atEnd && started ? "Replay from the 1980s" : "Play the decade animation"}
              className="grid h-[48px] w-[48px] shrink-0 place-items-center rounded-full bg-text text-bg transition-colors hover:bg-white"
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" /></svg>
              ) : atEnd && started ? (
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 9a5.5 5.5 0 1 0 1.6-3.9" /><path d="M3 2.5v3.6h3.6" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden><path d="M3 1.5v11l9.5-5.5z" fill="currentColor" /></svg>
              )}
            </button>
          )}
          <div
            role="slider"
            aria-label="Decade"
            aria-valuemin={0}
            aria-valuemax={FRAMES.length - 1}
            aria-valuenow={frame}
            aria-valuetext={`${d.label}, ${span(FRAMES[frame])}, national mean ${fmt(NATIONAL[frame].mean)}`}
            className="min-w-0 flex-1"
          >
            <div className="flex h-[34px] gap-[3px]">
              {FRAMES.map((k, i) => {
                const reached = i <= frame;
                return (
                  <button
                    key={k}
                    type="button"
                    tabIndex={-1}
                    onClick={() => {
                      pause();
                      goTo(i);
                    }}
                    aria-label={`Go to the ${GRID.decades[k].label}`}
                    className={`relative flex-1 overflow-hidden rounded-[4px] bg-track ${i === frame ? "ring-2 ring-text ring-offset-2 ring-offset-card" : ""}`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-0 origin-left"
                      style={{
                        background: toColor(NATIONAL[i].mean),
                        transform: `scaleX(${reached ? 1 : 0})`,
                        transition: reduced ? "none" : "transform 700ms cubic-bezier(.65,0,.35,1)",
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-[3px] text-[12px] text-muted tnum">
              {FRAMES.map((k, i) => (
                <span key={k} className={`flex-1 text-center ${i === frame ? "font-semibold text-text" : ""}`}>
                  <span className="hidden sm:inline">{GRID.decades[k].label}</span>
                  <span className="sm:hidden">{GRID.decades[k].label.replace(" so far", "*")}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <p id="decades-help" className="mt-4 text-[12.5px] leading-relaxed text-muted">
          Each stripe is one period, colored by its national mean. {reduced ? "Use the stripes or the arrow keys to move between decades." : "Space plays or pauses; the arrow keys step one decade."} Hover the map for a state and a cell.
        </p>
      </div>

      <figcaption className="border-t border-rule px-6 py-5 text-[14px] leading-relaxed text-body md:px-9">
        Mean temperature of each period, {span(FRAMES[0])} to {span(FRAMES[FRAMES.length - 1])}, as the change against the {BASE.label} ({span(BASELINE_DECADE)}) in every cell.
        Baseline: {span(BASELINE_DECADE)} ({BASE.label}), each cell against its own mean over those years. Decade means of complete years. Cells without data are left empty.
        {PARTIAL ? ` The ${PARTIAL.label} covers ${PARTIAL.from}-${PARTIAL.to} only and is never extrapolated to ten years.` : ""}
        <span className="mt-2 block text-[12px] text-muted">Data source: NASA POWER, MERRA-2 based, 1 degree grid, T2M monthly, {CELLS.length} cells.</span>
      </figcaption>
    </figure>
  );
}

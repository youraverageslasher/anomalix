import type { Analysis } from "./data/analyze";
import { BASELINE_LABEL } from "./data/analyze";
import type { Verdict } from "./data/verdict";
import { stripeColor } from "./data/color";
import { coordText, fixed, pLabel, signed } from "./data/fmt";
import { VARIABLES, directionWord, NEUTRAL_SERIES, type VariableCode } from "./data/variables";

export const CARD_W = 1080;
export const CARD_H = 1350;

const C = {
  bg: "#0D1015",
  card: "#161A21",
  rule: "#2B323C",
  border: "#3B4656",
  text: "#ECEEF1",
  body: "#B3BBC7",
  muted: "#8D97A6",
  signal: "#EF5A4C",
  cool: "#5C97EA",
};

export interface CardInput {
  name: string;
  line: string | null;
  lat: number;
  lon: number;
  from: number;
  to: number;
  analysis: Analysis;
  verdict: Verdict;
  /* Planet rate on the years both series share, plus the comparison line built from the data. */
  planet: { perDecade: number; ci: number; line: string } | null;
  variable: VariableCode;
}

let SERIF = "Georgia, serif";
let SANS = "system-ui, sans-serif";

function resolveFonts() {
  const css = getComputedStyle(document.documentElement);
  const serif = css.getPropertyValue("--font-serif").trim();
  const sans = css.getPropertyValue("--font-sans").trim();
  if (serif) SERIF = `${serif}, Georgia, serif`;
  if (sans) SANS = `${sans}, system-ui, sans-serif`;
}

export async function ensureCardFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  resolveFonts();
  await Promise.all([`500 60px ${SERIF}`, `400 24px ${SANS}`, `600 16px ${SANS}`].map((f) => document.fonts.load(f).catch(() => undefined)));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, size: number, maxW: number) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > 20) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, tracking: number, align: "left" | "right" = "left") {
  const chars = [...text];
  const width = chars.reduce((w, ch) => w + ctx.measureText(ch).width + tracking, -tracking);
  let cx = align === "right" ? x - width : x;
  for (const ch of chars) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
}

/* Draws the share card from the same analysis the report shows; every figure comes from `input`. */
export function drawCard(ctx: CanvasRenderingContext2D, input: CardInput, host: string) {
  const { analysis: a, verdict: v } = input;
  const t = a.trend;
  const W = CARD_W;
  const M = 80;
  const inconclusive = v.confidence === "Inconclusive";
  const V = VARIABLES[input.variable];
  const tone = inconclusive || !V.temperature ? C.muted : v.direction === "up" ? C.signal : C.cool;

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, CARD_H);
  ctx.fillStyle = V.temperature ? C.signal : NEUTRAL_SERIES;
  ctx.fillRect(0, 0, W, 6);
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = C.text;
  ctx.font = `500 34px ${SERIF}`;
  ctx.fillText("Anomalix", M, 110);
  const brandW = ctx.measureText("Anomalix").width;
  ctx.fillStyle = C.muted;
  ctx.font = `400 20px ${SANS}`;
  ctx.fillText("Climate Detective", M + brandW + 16, 108);
  ctx.font = `600 15px ${SANS}`;
  spaced(ctx, "NASA SPACE APPS 2026", W - M, 108, 2.2, "right");

  ctx.fillStyle = C.muted;
  ctx.font = `600 16px ${SANS}`;
  spaced(ctx, `${V.short.toUpperCase()} TREND · ${V.code} · ${input.from}-${input.to}`, M, 214, 2.6);
  fit(ctx, input.name, 500, SERIF, 72, W - 2 * M);
  ctx.fillStyle = C.text;
  ctx.fillText(input.name, M, 296);
  ctx.fillStyle = C.body;
  ctx.font = `400 21px ${SANS}`;
  ctx.fillText(input.line && input.line !== input.name ? `${input.line} · ${coordText(input.lat, input.lon)}` : coordText(input.lat, input.lon), M, 342);

  const seal = inconclusive ? (v.methodsAgree ? "Inconclusive" : "Inconclusive · methods disagree") : `${directionWord(input.variable, v.direction)} · ${v.confidence} confidence`;
  ctx.font = `600 22px ${SANS}`;
  const sw = ctx.measureText(seal).width + 60;
  roundRect(ctx, M, 396, sw, 52, 26);
  ctx.strokeStyle = tone;
  ctx.lineWidth = 2;
  if (inconclusive) ctx.setLineDash([7, 6]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = tone;
  ctx.beginPath();
  ctx.arc(M + 28, 422, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.text;
  ctx.fillText(seal, M + 46, 430);

  ctx.fillStyle = C.text;
  ctx.font = `500 168px ${SERIF}`;
  const big = signed(t.perDecade, V.digits);
  fit(ctx, big, 500, SERIF, 168, W - 2 * M - 260);
  ctx.fillText(big, M - 6, 630);
  const bigW = ctx.measureText(big).width;
  ctx.fillStyle = C.muted;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(`${V.unit} per decade`, M + bigW + 14, 630);
  ctx.fillStyle = C.body;
  ctx.font = `400 24px ${SANS}`;
  ctx.fillText(`± ${fixed(t.ci95PerDecade, V.digits)} at 95% · regression ${pLabel(t.p)} · Mann-Kendall Z ${fixed(a.mk.z)}, ${pLabel(a.mk.p)}`, M, 690);

  const sy = 760;
  const sh = 150;
  const n = a.anomalies.length;
  const bw = (W - 2 * M) / Math.max(1, n);
  roundRect(ctx, M, sy, W - 2 * M, sh, 18);
  ctx.save();
  ctx.clip();
  if (V.temperature) {
    a.anomalies.forEach((p, i) => {
      ctx.fillStyle = stripeColor(p.value);
      ctx.fillRect(M + i * bw, sy, Math.ceil(bw) + 0.5, sh);
    });
  } else {
    /* Neutral bars above and below the baseline mean: the blue to red scale is kept for temperature. */
    ctx.fillStyle = C.card;
    ctx.fillRect(M, sy, W - 2 * M, sh);
    const maxAbs = Math.max(...a.anomalies.map((p) => Math.abs(p.value)), 1e-9);
    const mid = sy + sh / 2;
    ctx.fillStyle = NEUTRAL_SERIES;
    a.anomalies.forEach((p, i) => {
      const h = (Math.abs(p.value) / maxAbs) * (sh / 2 - 8);
      ctx.fillRect(M + i * bw + bw * 0.15, p.value >= 0 ? mid - h : mid, bw * 0.7, h);
    });
    ctx.fillStyle = C.border;
    ctx.fillRect(M, mid, W - 2 * M, 1);
  }
  ctx.restore();
  ctx.fillStyle = C.muted;
  ctx.font = `400 18px ${SANS}`;
  ctx.fillText(String(input.from), M, sy + sh + 34);
  ctx.textAlign = "right";
  ctx.fillText(String(input.to), W - M, sy + sh + 34);
  ctx.textAlign = "center";
  ctx.fillText(V.temperature ? `One stripe per year, against ${BASELINE_LABEL}` : `One bar per year, ${V.unit} against ${BASELINE_LABEL}`, W / 2, sy + sh + 34);
  ctx.textAlign = "left";

  ctx.fillStyle = C.text;
  ctx.font = `400 28px ${SANS}`;
  const line1 = inconclusive
    ? "The test cannot rule out chance here. We say so."
    : `Across ${input.from}-${input.to}, the trend adds up to ${signed(a.totalChange, V.digits >= 3 ? 2 : 1)} ${V.unit}.`;
  ctx.fillText(line1, M, 1040);
  if (input.planet && V.temperature) {
    ctx.fillStyle = C.body;
    ctx.font = `400 22px ${SANS}`;
    ctx.fillText(`Planet on the same years (GISTEMP): ${signed(input.planet.perDecade)} ± ${fixed(input.planet.ci)} °C per decade.`, M, 1084);
    ctx.fillText(`${input.planet.line} A comparison, not a proof.`, M, 1118);
  }

  ctx.strokeStyle = C.rule;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(M, 1180);
  ctx.lineTo(W - M, 1180);
  ctx.stroke();
  ctx.fillStyle = C.muted;
  ctx.font = `400 18px ${SANS}`;
  ctx.fillText(V.temperature ? "Data: NASA POWER (MERRA-2) · NASA GISS GISTEMP v4" : `Data: NASA POWER, MERRA-2 based, monthly · ${V.name} (${V.code})`, M, 1226);
  ctx.fillText("Grid cell ≈ 55 × 69 km, not a single station. Trends, not causes.", M, 1258);
  ctx.fillStyle = C.text;
  ctx.font = `600 20px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillText(host, W - M, 1226);
  ctx.textAlign = "left";
}

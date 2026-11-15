export const RAMP: [number, string][] = [
  [0, "#2D5FD6"],
  [0.12, "#5C97EA"],
  [0.22, "#A9CBF2"],
  [0.375, "#E9E7E1"],
  [0.52, "#F6C79B"],
  [0.6, "#EE8A55"],
  [0.68, "#D44A33"],
  [0.76, "#9B1C24"],
];

export const BINS = ["#3c71dc", "#5994e9", "#90baef", "#bbd3ed", "#dae0e5", "#ecdfcf", "#f3ceab", "#f2a776", "#e26c45", "#bd372d"];
export const BIN_MIN = 0;
export const BIN_MAX = 0.75;

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

export function colorFor(valuePerDecade: number): string {
  if (!Number.isFinite(valuePerDecade)) return "#323A46";
  const v = valuePerDecade;
  if (v <= RAMP[0][0]) return RAMP[0][1];
  const last = RAMP[RAMP.length - 1];
  if (v >= last[0]) return last[1];
  for (let i = 1; i < RAMP.length; i++) {
    const [x1, c1] = RAMP[i];
    if (v <= x1) {
      const [x0, c0] = RAMP[i - 1];
      const t = (v - x0) / (x1 - x0);
      const a = hex(c0);
      const b = hex(c1);
      return toHex(a.map((ch, k) => ch + (b[k] - ch) * t));
    }
  }
  return last[1];
}

export function binFor(valuePerDecade: number): string {
  const step = (BIN_MAX - BIN_MIN) / BINS.length;
  const i = Math.floor((valuePerDecade - BIN_MIN) / step);
  return BINS[Math.max(0, Math.min(BINS.length - 1, i))];
}

export function stripeColor(anomaly: number): string {
  return colorFor(0.375 + Math.max(-1, Math.min(1, anomaly / 1.9)) * 0.375);
}

export function num(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return "-";
  const fixed = Math.abs(v).toFixed(decimals);
  const neg = v < 0 && Number(fixed) !== 0;
  return (neg ? "-" : "") + fixed;
}

export function signed(v: number, decimals = 2): string {
  if (!Number.isFinite(v)) return "-";
  const s = num(v, decimals);
  if (s.startsWith("-")) return s;
  return Number(s) === 0 ? s : "+" + s;
}

export function pValue(p: number): string {
  if (!Number.isFinite(p)) return "-";
  if (p < 0.001) return "p < 0.001";
  if (p < 0.01) return "p = " + num(p, 3);
  return "p = " + num(p, 2);
}

export function coordLabel(lat: number, lon: number, decimals = 2): string {
  const ns = lat < 0 ? "S" : "N";
  const ew = lon < 0 ? "W" : "E";
  return `${num(Math.abs(lat), decimals)}° ${ns} · ${num(Math.abs(lon), decimals)}° ${ew}`;
}

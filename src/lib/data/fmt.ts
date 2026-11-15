export function signed(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return "n/a";
  const s = Math.abs(v).toFixed(digits);
  if (Number(s) === 0) return s;
  return (v < 0 ? "-" : "+") + s;
}

export function fixed(v: number, digits = 2): string {
  return Number.isFinite(v) ? v.toFixed(digits) : "n/a";
}

export function pLabel(p: number): string {
  if (!Number.isFinite(p)) return "p n/a";
  if (p < 0.001) return "p < 0.001";
  if (p < 0.01) return "p < 0.01";
  return `p = ${p.toFixed(2)}`;
}

export function intLabel(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function pShort(p: number): string {
  if (!Number.isFinite(p)) return "n/a";
  if (p < 0.001) return "< 0.001";
  if (p < 0.01) return "< 0.01";
  return p.toFixed(2);
}

export function coordText(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}° ${lat < 0 ? "S" : "N"} · ${Math.abs(lon).toFixed(2)}° ${lon < 0 ? "W" : "E"}`;
}

export function todayLabel(d = new Date()): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function reportCode(parts: string): string {
  let h = 2166136261;
  for (let i = 0; i < parts.length; i++) {
    h ^= parts.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36).toUpperCase().slice(0, 5).padStart(5, "0");
}

/* Where a GISTEMP series came from: the live NASA file, or the copy bundled with the app when the live request failed. */
export type DataOrigin = { kind: "live" } | { kind: "snapshot"; fetchedAt: string; lastModified: string | null; reason: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* Fixed UTC formatting, so the server and the browser print the same date. */
export function utcDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/* "NASA GISS GISTEMP v4", plus the snapshot date when the bundled copy was used. */
export function gistempName(origin?: DataOrigin | null): string {
  return origin?.kind === "snapshot" ? `NASA GISS GISTEMP v4 (bundled snapshot fetched ${utcDate(origin.fetchedAt)}, live file unreachable)` : "NASA GISS GISTEMP v4";
}

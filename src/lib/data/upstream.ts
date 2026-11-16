/* Text fetch for the NASA GISS files, with a diagnostic log line on every failure. */
export const UPSTREAM_TIMEOUT_MS = 7000;
export const USER_AGENT = "Anomalix/1.0 (NASA Space Apps 2026; +https://github.com/youraverageslasher/anomalix)";

export type UpstreamText = { ok: true; text: string; status: number; ms: number } | { ok: false; reason: string; status: number | null; ms: number };

/* The error that undici throws is "fetch failed"; the useful part (ECONNRESET, UND_ERR_CONNECT_TIMEOUT, ENOTFOUND, a TLS code) is in cause. */
function describe(e: unknown): string {
  if (!(e instanceof Error)) return String(e);
  const cause = (e as Error & { cause?: unknown }).cause;
  const c = cause instanceof Error ? `${(cause as Error & { code?: string }).code ?? cause.name}: ${cause.message}` : cause ? String(cause) : "";
  return `${e.name}: ${e.message}${c ? ` (cause ${c})` : ""}`;
}

export async function fetchUpstreamText(url: string, label: string, revalidate: number, timeoutMs = UPSTREAM_TIMEOUT_MS): Promise<UpstreamText> {
  const t0 = Date.now();
  const log = (status: number | null, reason: string) =>
    console.error(
      JSON.stringify({ upstream: label, url, status, reason, ms: Date.now() - t0, region: process.env.VERCEL_REGION ?? null, runtime: process.env.NEXT_RUNTIME ?? "nodejs" }),
    );
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/csv,text/plain,*/*" },
      redirect: "follow",
      next: { revalidate },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const reason = `answered ${res.status}${res.redirected ? ` after a redirect to ${res.url}` : ""}`;
      log(res.status, reason);
      return { ok: false, reason, status: res.status, ms: Date.now() - t0 };
    }
    const text = await res.text();
    return { ok: true, text, status: res.status, ms: Date.now() - t0 };
  } catch (e) {
    const reason = describe(e);
    log(null, reason);
    return { ok: false, reason, status: null, ms: Date.now() - t0 };
  }
}

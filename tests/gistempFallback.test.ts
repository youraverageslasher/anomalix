import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GISTEMP_SNAPSHOT } from "@/lib/data/gistempSnapshot";
import { loadGistemp, parseGistempMonthly, GISTEMP_URL } from "@/lib/data/gistemp";
import { loadZonal, parseZonal, ZONAL_URL } from "@/lib/data/zonal";
import { fetchUpstreamText, USER_AGENT, type UpstreamText } from "@/lib/data/upstream";
import { gistempName, utcDate } from "@/lib/data/origin";

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest("hex");
const file = (name: string) => readFileSync(path.join(__dirname, "../data/gistemp", name), "utf8");
const failing = async (): Promise<UpstreamText> => ({ ok: false, reason: "TypeError: fetch failed (cause UND_ERR_CONNECT_TIMEOUT: Connect Timeout Error)", status: null, ms: 7000 });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("bundled GISTEMP snapshot", () => {
  it("is byte for byte the files in data/gistemp, with the recorded checksums", () => {
    expect(GISTEMP_SNAPSHOT.glb.csv).toBe(file("GLB.Ts+dSST.csv"));
    expect(GISTEMP_SNAPSHOT.zonal.csv).toBe(file("ZonAnn.Ts+dSST.csv"));
    expect(sha(GISTEMP_SNAPSHOT.glb.csv)).toBe(GISTEMP_SNAPSHOT.glb.sha256);
    expect(sha(GISTEMP_SNAPSHOT.zonal.csv)).toBe(GISTEMP_SNAPSHOT.zonal.sha256);
    const meta = JSON.parse(file("snapshot.json"));
    expect(GISTEMP_SNAPSHOT.fetchedAt).toBe(meta.fetchedAt);
    expect(meta.files["GLB.Ts+dSST.csv"]).toBe(GISTEMP_URL);
    expect(meta.files["ZonAnn.Ts+dSST.csv"]).toBe(ZONAL_URL);
  });
});

describe("GISTEMP fallback", () => {
  it("serves the snapshot when the live request fails, with the same numbers the parser gives for that file", async () => {
    const r = await loadGistemp(failing);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.origin).toEqual({ kind: "snapshot", fetchedAt: GISTEMP_SNAPSHOT.fetchedAt, lastModified: GISTEMP_SNAPSHOT.lastModified, reason: expect.stringContaining("UND_ERR_CONNECT_TIMEOUT") });
    const direct = parseGistempMonthly(GISTEMP_SNAPSHOT.glb.csv);
    expect(r.data.months).toEqual(direct.months);
    expect([r.data.firstYear, r.data.lastYear]).toEqual([direct.firstYear, direct.lastYear]);
  });
  it("uses the live file when it answers, and falls back when it answers with no usable years", async () => {
    const live = await loadGistemp(async () => ({ ok: true, text: GISTEMP_SNAPSHOT.glb.csv, status: 200, ms: 300 }));
    expect(live.ok && live.data.origin).toEqual({ kind: "live" });
    const empty = await loadGistemp(async () => ({ ok: true, text: "<html>blocked</html>", status: 200, ms: 300 }));
    expect(empty.ok && empty.data.origin?.kind).toBe("snapshot");
  });
  it("does the same for the zonal file", async () => {
    const r = await loadZonal(failing);
    expect(r.ok && r.data.origin?.kind).toBe("snapshot");
    if (!r.ok) return;
    expect(r.data.global).toEqual(parseZonal(GISTEMP_SNAPSHOT.zonal.csv)?.global);
    const live = await loadZonal(async () => ({ ok: true, text: GISTEMP_SNAPSHOT.zonal.csv, status: 200, ms: 300 }));
    expect(live.ok && live.data.origin).toEqual({ kind: "live" });
  });
  it("answers /api/global with the snapshot, labeled, and a short CDN cache, when NASA GISS cannot be reached", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("fetch failed"))));
    const { GET } = await import("@/app/api/global/route");
    const res = await GET(new Request("http://localhost/api/global"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=600");
    const body = await res.json();
    expect(body.origin.kind).toBe("snapshot");
    expect(body.origin.fetchedAt).toBe(GISTEMP_SNAPSHOT.fetchedAt);
    expect(body.analysis.trend.perDecade).toBeGreaterThan(0);
  });
});

describe("upstream diagnostics", () => {
  it("logs the real cause of a thrown fetch, with a User-Agent on the request", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = Object.assign(new Error("Connect Timeout Error"), { code: "UND_ERR_CONNECT_TIMEOUT" });
    const f = vi.fn(async (_u: string, _i?: RequestInit) => Promise.reject(new TypeError("fetch failed", { cause })));
    vi.stubGlobal("fetch", f);
    const r = await fetchUpstreamText(GISTEMP_URL, "gistemp", 0, 50);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toContain("UND_ERR_CONNECT_TIMEOUT");
    expect((f.mock.calls[0][1]?.headers as Record<string, string>)["User-Agent"]).toBe(USER_AGENT);
    const line = JSON.parse(log.mock.calls[0][0] as string);
    expect(line).toMatchObject({ upstream: "gistemp", url: GISTEMP_URL, status: null });
  });
  it("logs an error status", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Forbidden", { status: 403 })));
    const r = await fetchUpstreamText(GISTEMP_URL, "gistemp", 0, 50);
    expect(r).toMatchObject({ ok: false, status: 403, reason: "answered 403" });
  });
  it("labels the source line with the fetch date only for the snapshot", () => {
    expect(gistempName({ kind: "live" })).toBe("NASA GISS GISTEMP v4");
    expect(utcDate(GISTEMP_SNAPSHOT.fetchedAt)).toBe("16 Nov 2026");
    expect(gistempName({ kind: "snapshot", fetchedAt: GISTEMP_SNAPSHOT.fetchedAt, lastModified: null, reason: "x" })).toBe(
      "NASA GISS GISTEMP v4 (bundled snapshot fetched 16 Nov 2026, live file unreachable)",
    );
  });
});

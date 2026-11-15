import { NextResponse } from "next/server";
import { compareCities } from "@/lib/data/report";
import { readOptions } from "@/lib/data/params";
import { EXAMPLE_CITIES } from "@/lib/data/cities";
import { POWER_END, POWER_START } from "@/lib/data/power";
import { isVariable } from "@/lib/data/variables";

export const revalidate = 86400;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const opts = readOptions(sp, POWER_START, POWER_END);
  if (typeof opts === "string") return NextResponse.json({ error: opts }, { status: 400 });
  const variable = (sp.get("variable") ?? "T2M").toUpperCase();
  if (!isVariable(variable)) return NextResponse.json({ error: "variable must be T2M, PRECTOTCORR, RH2M or WS2M" }, { status: 400 });
  const rows = await compareCities(EXAMPLE_CITIES, opts, variable);
  return NextResponse.json(
    rows.map(({ place, result }) =>
      result.ok
        ? {
            place,
            ok: true,
            perDecade: result.data.analysis.trend.perDecade,
            ci95: result.data.analysis.trend.ci95PerDecade,
            p: result.data.analysis.trend.p,
            mk: result.data.analysis.mk,
            verdict: result.data.verdict,
            anomalies: result.data.analysis.anomalies,
          }
        : { place, ok: false, error: result.error },
    ),
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } },
  );
}

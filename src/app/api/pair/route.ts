import { NextResponse } from "next/server";
import { comparePlaces } from "@/lib/data/report";
import { readOptions } from "@/lib/data/params";
import { parsePlaceParam } from "@/lib/data/pairCompare";
import { POWER_END, POWER_START } from "@/lib/data/power";
import { isVariable } from "@/lib/data/variables";

export const revalidate = 86400;

/* /api/pair?a=lat,lon,name&b=lat,lon,name&variable=T2M&start=&end=&season= */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const a = parsePlaceParam(sp.get("a"));
  const b = parsePlaceParam(sp.get("b"));
  if (!a || !b) return NextResponse.json({ error: "a and b are required as lat,lon,name", code: "params" }, { status: 400 });
  const opts = readOptions(sp, POWER_START, POWER_END);
  if (typeof opts === "string") return NextResponse.json({ error: opts, code: "params" }, { status: 400 });
  const variable = (sp.get("variable") ?? "T2M").toUpperCase();
  if (!isVariable(variable)) return NextResponse.json({ error: "variable must be T2M, PRECTOTCORR, RH2M or WS2M", code: "params" }, { status: 400 });
  const r = await comparePlaces(a, b, opts, variable);
  if (!r.ok) return NextResponse.json({ error: r.error, code: r.code }, { status: r.code === "data" ? 502 : 422 });
  return NextResponse.json(r.data, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } });
}

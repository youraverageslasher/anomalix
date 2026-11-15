import { NextResponse } from "next/server";
import { cityReport } from "@/lib/data/report";
import { readOptions } from "@/lib/data/params";
import { POWER_END, POWER_START } from "@/lib/data/power";
import { isVariable } from "@/lib/data/variables";

export const revalidate = 86400;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  if (!sp.get("lat") || !sp.get("lon") || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }
  const opts = readOptions(sp, POWER_START, POWER_END);
  if (typeof opts === "string") return NextResponse.json({ error: opts }, { status: 400 });
  const variable = (sp.get("variable") ?? "T2M").toUpperCase();
  if (!isVariable(variable)) return NextResponse.json({ error: "variable must be T2M, PRECTOTCORR, RH2M or WS2M" }, { status: 400 });
  const result = await cityReport({ name: sp.get("name") ?? "", lat, lon }, opts, variable, sp.get("extras") !== "0");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
  });
}

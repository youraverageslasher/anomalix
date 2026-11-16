import { NextResponse } from "next/server";
import { weekReport } from "@/lib/data/week";

export const revalidate = 1800;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const lat = Number(sp.get("lat"));
  const lon = Number(sp.get("lon"));
  if (!sp.get("lat") || !sp.get("lon") || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }
  const r = await weekReport(lat, lon);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(r.data, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800" } });
}

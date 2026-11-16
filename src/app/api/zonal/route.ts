import { NextResponse } from "next/server";
import { fetchZonal } from "@/lib/data/zonal";

export const revalidate = 86400;

export async function GET() {
  const r = await fetchZonal();
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
  return NextResponse.json(r.data, { headers: { "Cache-Control": r.data.origin?.kind === "snapshot" ? "public, s-maxage=600, stale-while-revalidate=600" : "public, s-maxage=86400, stale-while-revalidate=86400" } });
}

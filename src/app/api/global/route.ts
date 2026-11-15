import { NextResponse } from "next/server";
import { globalReport } from "@/lib/data/report";
import { readOptions } from "@/lib/data/params";
import { GISTEMP_FIRST_REQUEST } from "@/lib/data/gistemp";

export const revalidate = 86400;

export async function GET(req: Request) {
  const opts = readOptions(new URL(req.url).searchParams, GISTEMP_FIRST_REQUEST, new Date().getUTCFullYear());
  if (typeof opts === "string") return NextResponse.json({ error: opts }, { status: 400 });
  const result = await globalReport(opts);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" },
  });
}

"use client";

import { useEffect, useState } from "react";
import type { CompareRow } from "@/lib/data/compare-types";

type State = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; rows: CompareRow[] };

let cache: Promise<State> | null = null;

function load(): Promise<State> {
  cache ??= fetch("/api/compare")
    .then(async (r) => {
      if (!r.ok) return { status: "error", error: `The comparison service answered ${r.status}.` } as State;
      return { status: "ready", rows: (await r.json()) as CompareRow[] } as State;
    })
    .catch(() => ({ status: "error", error: "The comparison service did not respond." }) as State);
  cache.then((s) => {
    if (s.status === "error") cache = null;
  });
  return cache;
}

export function useCompare(): State {
  const [state, setState] = useState<State>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    load().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

export function rowFor(rows: CompareRow[], name: string) {
  return rows.find((r) => r.place.name === name);
}

/* The years the example cities really cover, read from the live comparison. null until it loads. */
export function useHomeSpan(): { from: number; to: number; n: number } | null {
  const s = useCompare();
  if (s.status !== "ready") return null;
  const row = s.rows.find((r) => r.ok && r.anomalies.length);
  if (!row || !row.ok) return null;
  const a = row.anomalies;
  return { from: a[0].year, to: a[a.length - 1].year, n: a.length };
}

export function HomeSpan({ fallback = "the full record" }: { fallback?: string }) {
  const span = useHomeSpan();
  return span ? `${span.from}-${span.to}` : fallback;
}

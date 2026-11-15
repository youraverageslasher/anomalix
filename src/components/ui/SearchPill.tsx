"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseCoords, reportHref, type Place } from "@/lib/geo";
import { stateByAdmin1 } from "@/lib/data/locate";
import { coordLabel } from "@/lib/format";
import { LoadingDots } from "../Dots";

interface GeoResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
  country_code?: string;
}

function labelFor(r: GeoResult): string {
  if (r.country_code === "BR") {
    const uf = stateByAdmin1(r.admin1)?.properties.sigla;
    return uf ? `${r.name}, ${uf}` : r.name;
  }
  return [r.name, r.admin1, r.country].filter(Boolean).join(", ");
}

export async function geocode(q: string, signal?: AbortSignal, count = 5): Promise<Place[]> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=${count}&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("geocoding");
  const json = (await res.json()) as { results?: GeoResult[] };
  const results = json.results ?? [];
  results.sort((a, b) => Number(b.country_code === "BR") - Number(a.country_code === "BR"));
  return results.map((r) => ({ nome: labelFor(r), lat: r.latitude, lon: r.longitude, cc: r.country_code, admin1: r.admin1 }));
}

export function SearchPill({ placeholder = "City name or coordinates" }: { placeholder?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    setError(null);
    const term = q.trim();
    if (term.length < 2 || parseCoords(term)) {
      setItems([]);
      return;
    }
    const t = setTimeout(async () => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      try {
        const r = await geocode(term, c.signal);
        setItems(r);
        setActive(0);
        setOpen(true);
      } catch {
        if (!c.signal.aborted) setItems([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function go(p: Place) {
    setOpen(false);
    setBusy(true);
    router.push(reportHref(p));
  }

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    const coords = parseCoords(term);
    if (coords) return go({ ...coords, nome: coordLabel(coords.lat, coords.lon) });
    if (items.length > 0) return go(items[active] ?? items[0]);
    setBusy(true);
    try {
      const r = await geocode(term);
      if (r.length === 0) {
        setBusy(false);
        setError("We could not find that place. Check the spelling or paste coordinates, for example -20.81, -49.38.");
        return;
      }
      go(r[0]);
    } catch {
      setBusy(false);
      setError("The place search did not respond. Try again, or paste coordinates.");
    }
  }

  return (
    <div className="relative w-full max-w-[640px]">
      <form
        onSubmit={submit}
        role="search"
        className="flex h-[64px] items-center gap-2 rounded-full border border-rule bg-card pl-5 pr-[6px] shadow-float transition-colors focus-within:border-text focus-within:ring-2 focus-within:ring-text/40"
      >
        <label htmlFor="busca" className="sr-only">
          City or coordinates
        </label>
        <span className="flex items-center text-muted" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <input
          id="busca"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (!open || items.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => (a + 1) % items.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => (a - 1 + items.length) % items.length);
            } else if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls="busca-lista"
          className="min-w-0 flex-1 bg-transparent px-2 text-[16px] text-text placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-[52px] shrink-0 rounded-full bg-text px-5 text-[15px] font-semibold text-bg transition-[background-color,transform] duration-200 hover:bg-white active:scale-[0.98] disabled:opacity-70 sm:px-7"
        >
          Investigate
        </button>
      </form>

      {open && items.length > 0 && (
        <ul
          id="busca-lista"
          role="listbox"
          className="absolute left-0 right-0 top-[72px] z-20 overflow-hidden rounded-card-sm border border-highlight-border bg-highlight shadow-float"
        >
          {items.map((p, i) => (
            <li key={`${p.nome}-${p.lat}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(p)}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left ${
                  i === active ? "bg-[rgba(255,255,255,.05)]" : ""
                }`}
              >
                <span className="truncate text-[15px] text-text">{p.nome}</span>
                <span className="tnum shrink-0 text-[12.5px] text-muted">
                  {coordLabel(p.lat, p.lon)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 min-h-[22px] px-5" aria-live="polite">
        {busy && <LoadingDots label="Opening the report" />}
        {error && <p className="text-[14px] text-body">{error}</p>}
      </div>
    </div>
  );
}

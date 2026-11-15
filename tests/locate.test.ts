import { describe, expect, it } from "vitest";
import { highlightOf, locate, normalizeName, placeLine, stateByAdmin1 } from "@/lib/data/locate";
import { resolveSearch } from "@/lib/useSearchedPlace";

/* Geocoded live from Open-Meteo at test time. Only the expected state and region names are written here. */
const CASES: { query: string; country: string; state?: string; region?: string; note?: string }[] = [
  { query: "São José do Rio Preto", country: "BR", state: "São Paulo", region: "Southeast" },
  { query: "Manaus", country: "BR", state: "Amazonas", region: "North" },
  { query: "Porto Alegre", country: "BR", state: "Rio Grande do Sul", region: "South" },
  { query: "Recife", country: "BR", state: "Pernambuco", region: "Northeast", note: "coastal" },
  { query: "Brasília", country: "BR", state: "Distrito Federal", region: "Center-West" },
  { query: "Delhi", country: "IN" },
  { query: "Petrolina", country: "BR", state: "Pernambuco", region: "Northeast", note: "on the Pernambuco and Bahia border" },
  { query: "Florianópolis", country: "BR", state: "Santa Catarina", region: "South", note: "coastal island" },
];

interface Geo {
  name: string;
  latitude: number;
  longitude: number;
  country_code: string;
  admin1?: string;
}

async function geocode(query: string, country: string): Promise<Geo> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`geocoder answered ${res.status}`);
  const json = (await res.json()) as { results?: Geo[] };
  const hit = json.results?.find((r) => r.country_code === country);
  if (!hit) throw new Error(`no ${country} result for ${query}`);
  return hit;
}

const live = await Promise.all(CASES.map(async (c) => ({ c, g: await geocode(c.query, c.country) }))).catch((e: Error) => {
  console.warn(`Skipping live geocoding tests: ${e.message}`);
  return null;
});

describe.skipIf(!live)("searched places, geocoded live", () => {
  for (const { c, g } of live ?? []) {
    it(`${c.query}${c.note ? ` (${c.note})` : ""}`, () => {
      const loc = locate({ lat: g.latitude, lon: g.longitude, countryCode: g.country_code, admin1: g.admin1 });
      if (!c.state) {
        expect(loc.kind).toBe("foreign");
        expect(highlightOf(loc)).toBeNull();
        return;
      }
      expect(loc.kind).toBe("brazil");
      if (loc.kind !== "brazil") return;
      expect(loc.state).toBe(c.state);
      expect(loc.regionName).toBe(c.region);
      expect(placeLine(g.name, loc)).toBe(`${g.name}, ${c.state}, ${c.region}`);
    });
  }

  it("same result without country and admin1, from geometry alone (old shared links)", () => {
    for (const { c, g } of live ?? []) {
      const loc = locate({ lat: g.latitude, lon: g.longitude });
      if (!c.state) expect(loc.kind).toBe("foreign");
      else expect(loc.kind === "brazil" && loc.state).toBe(c.state);
    }
  });

  it("a foreign country code never highlights Brazil, even on Brazilian coordinates", () => {
    const manaus = live?.find((x) => x.c.query === "Manaus")?.g;
    if (!manaus) return;
    expect(highlightOf(locate({ lat: manaus.latitude, lon: manaus.longitude, countryCode: "CO" }))).toBeNull();
  });
});

describe("resolver rules that need no network", () => {
  it("global search and no search give no highlight", () => {
    const none = resolveSearch(null);
    expect(none.highlight).toBeNull();
    expect(none.place).toBeNull();
  });
  it("admin1 matching ignores accents and knows the English name of the Federal District", () => {
    expect(normalizeName("São Paulo")).toBe("sao paulo");
    expect(stateByAdmin1("Federal District")?.properties.sigla).toBe("DF");
    expect(stateByAdmin1("Sao Paulo")?.properties.sigla).toBe("SP");
    expect(stateByAdmin1("Nowhere")).toBeNull();
  });
});

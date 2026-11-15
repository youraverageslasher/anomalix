import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { placeScope } from "@/lib/data/placeScope";
import { resolveSearch } from "@/lib/useSearchedPlace";
import { findAnalog, type AnalogCell } from "@/lib/data/analog";

/* Coordinates and names as the app's geocoder returns them; no statistic is typed here. */
const LONDON = { name: "London, England, United Kingdom", lat: 51.50853, lon: -0.12574, cc: "GB", admin1: "England" };
const RIO_PRETO = { name: "São José do Rio Preto, SP", lat: -20.81972, lon: -49.37944, cc: "BR", admin1: "São Paulo" };

describe("place report scope: only the searched place", () => {
  it("a London report contains no Brazil-only content anywhere", () => {
    const search = resolveSearch(LONDON);
    const s = placeScope({ global: false, loc: search.loc });
    expect(s).toEqual({
      inBrazil: false,
      sigla: null,
      showBrazilFigure: false,
      showRegions: false,
      showAnalog: false,
      showStateStep: false,
      shadeBrazilOnGlobe: false,
    });
    expect(search.highlight).toBeNull();
    expect(search.line ?? "").not.toMatch(/Brazil|Southeast|North|South|Center-West|Northeast/);
  });
  it("a São José do Rio Preto report keeps the Brazil section with the state highlight", () => {
    const search = resolveSearch(RIO_PRETO);
    const s = placeScope({ global: false, loc: search.loc });
    expect(s.inBrazil).toBe(true);
    expect(s.showBrazilFigure).toBe(true);
    expect(s.showRegions).toBe(true);
    expect(s.sigla).toBe("SP");
    expect(search.highlight?.sigla).toBe("SP");
  });
  it("the Global report shows no Brazil-only content", () => {
    const s = placeScope({ global: true, loc: null });
    expect(Object.values(s).some((v) => v === true)).toBe(false);
  });
  it("a place with no analog match shows no analog", () => {
    const cells: AnalogCell[] = [
      { lat: -10.5, lon: -48.5, state: "TO", early: 26 },
      { lat: -30.5, lon: -51.5, state: "RS", early: 18 },
    ];
    /* A mean far from every cell: no match within the limit, so nothing is drawn. */
    expect(findAnalog({ lat: 51.5, lon: -0.1, mean: 11 }, cells)).toBeNull();
    expect(placeScope({ global: false, loc: resolveSearch(LONDON).loc }).showAnalog).toBe(false);
  });
  it("the hero globe marks no other city and draws no decorative arcs", () => {
    const hero = readFileSync(path.join(__dirname, "../src/components/report/Hero.tsx"), "utf8");
    expect(hero).not.toMatch(/LONDON|NAIROBI|Nairobi/);
    expect(hero).toMatch(/const arcs: MapArc\[\] = \[\];/);
  });
  it("every Brazil-only section of the report is gated by the place scope", () => {
    const page = readFileSync(path.join(__dirname, "../src/components/report/ReportPage.tsx"), "utf8");
    expect(page).toMatch(/scope\.showBrazilFigure && <BrazilFigure/);
    expect(page).toMatch(/scope\.showRegions && <Regions/);
    expect(page).toMatch(/scope\.showAnalog && \(/);
    expect(page).toMatch(/sigla=\{scope\.showStateStep \? scope\.sigla : null\}/);
  });
});

import type { Located } from "./locate";

/*
 * Rule for the place report: every section shows the searched place or nothing.
 * Brazil-only content (the state map, the region cards, the Brazil grid analog, the state step, the state shading on
 * the globe) appears only when the searched place itself is located in Brazil.
 */
export interface PlaceScope {
  inBrazil: boolean;
  sigla: string | null;
  showBrazilFigure: boolean;
  showRegions: boolean;
  showAnalog: boolean;
  showStateStep: boolean;
  shadeBrazilOnGlobe: boolean;
}

export function placeScope({ global, loc }: { global: boolean; loc: Located | null }): PlaceScope {
  const inBrazil = !global && loc?.kind === "brazil";
  const sigla = inBrazil && loc?.kind === "brazil" ? loc.sigla : null;
  return {
    inBrazil,
    sigla,
    showBrazilFigure: inBrazil,
    showRegions: inBrazil,
    showAnalog: inBrazil,
    showStateStep: inBrazil && sigla !== null,
    shadeBrazilOnGlobe: inBrazil,
  };
}

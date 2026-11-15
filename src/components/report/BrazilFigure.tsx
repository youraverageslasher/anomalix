import grid from "../../../public/data/brazil-grid.json";
import { Figure } from "@/components/v6/Figure";
import { BrazilChoropleth } from "@/components/v6/BrazilChoropleth";
import { Legend } from "@/components/v6/Legend";
import { intLabel } from "@/lib/data/fmt";
import type { RegionId } from "@/lib/data/brazil";
import type { SearchState } from "@/lib/useSearchedPlace";

const STATE_VALUES = Object.fromEntries(grid.states.map((s) => [s.sigla, s.value]));
const REGION_VALUES = grid.regions.map((r) => ({ id: r.id as RegionId, value: r.mean }));

export function BrazilFigure({ search, variable = "T2M", n, name, lat, lon, from, to }: { search: SearchState; variable?: string; n: number; name: string; lat: number; lon: number; from: number; to: number }) {
  const inBrazil = search.loc?.kind === "brazil";
  const fixedPeriod = grid.period;
  const differs = `${from}-${to}` !== fixedPeriod;
  return (
    <Figure
      n={n}
      title="Brazil, state by state · temperature"
      caption={
        <>
          Each state is the mean of its NASA grid points plus its capital.{" "}
          {differs && <>This map always covers {fixedPeriod}, whatever period you pick above. </>}
          {variable !== "T2M" && <>It shows air temperature only, whatever variable you pick above.</>}
        </>
      }
      source={`NASA POWER (MERRA-2), OLS trend ${fixedPeriod} per grid point. State fill is the state mean.`}
    >
      <div className="mx-auto max-w-[520px]">
        <BrazilChoropleth width={520} stateValues={STATE_VALUES} regions={REGION_VALUES} highlight={search.highlight} marker={inBrazil ? [lon, lat] : null} markerLabel={name} />
      </div>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <Legend nationalMean={grid.national.mean} />
        <div className="text-[12.5px] text-muted sm:text-right">
          <p>Computed from {intLabel(grid.national.count)} NASA grid points</p>
          {inBrazil && <p className="text-text">{search.line}</p>}
          {search.foreign && <p>{name.split(",")[0]} is outside Brazil, so nothing is highlighted here.</p>}
        </div>
      </div>
    </Figure>
  );
}

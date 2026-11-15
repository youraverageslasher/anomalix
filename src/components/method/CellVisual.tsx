"use client";

import { useMemo } from "react";
import { geoEquirectangular, geoPath } from "d3-geo";
import { brazilStates, worldLand } from "@/components/v6/geo";
import { CELL_LAT, CELL_LON } from "@/lib/data/power";
import { colorFor } from "@/lib/data/color";
import { CountUp, useInView } from "@/components/v6/motion";
import { coordText, intLabel, signed } from "@/lib/data/fmt";

const COLS = 9;
const ROWS = 7;

export function CellVisual({ lat, lon, cell, perDecade, months, from, to }: { lat: number; lon: number; cell: { lat: number; lon: number }; perDecade: number; months: number; from: number; to: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const W = 760;
  const H = 520;
  const geo = useMemo(() => {
    const lon0 = cell.lon - (COLS / 2) * CELL_LON;
    const lat0 = cell.lat - (ROWS / 2) * CELL_LAT;
    const bbox = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "Polygon" as const, coordinates: [[[lon0, lat0], [lon0, lat0 + ROWS * CELL_LAT], [lon0 + COLS * CELL_LON, lat0 + ROWS * CELL_LAT], [lon0 + COLS * CELL_LON, lat0], [lon0, lat0]]] },
    };
    const proj = geoEquirectangular().fitExtent([[0, 0], [W, H]], bbox);
    const path = geoPath(proj);
    const cells: { x: number; y: number; w: number; h: number; hit: boolean }[] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const a = proj([lon0 + c * CELL_LON, lat0 + (r + 1) * CELL_LAT])!;
        const b = proj([lon0 + (c + 1) * CELL_LON, lat0 + r * CELL_LAT])!;
        cells.push({ x: a[0], y: a[1], w: b[0] - a[0], h: b[1] - a[1], hit: c === Math.floor(COLS / 2) && r === Math.floor(ROWS / 2) });
      }
    return { path, proj, cells, land: path(worldLand()) ?? "", states: brazilStates().map((s) => path(s) ?? "") };
  }, [cell]);
  const city = geo.proj([lon, lat]);
  const kmLat = CELL_LAT * 111.2;
  const kmLon = CELL_LON * 111.32 * Math.cos((cell.lat * Math.PI) / 180);

  return (
    <div ref={ref} className="relative overflow-hidden rounded-card border border-rule bg-card shadow-card">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`NASA POWER grid around ${coordText(lat, lon)}, with the cell that covers the place highlighted`}>
        <g className={`cell-zoom ${inView ? "is-in" : ""}`} style={{ transformOrigin: `${W / 2}px ${H / 2}px` }}>
          <path d={geo.land} fill="#1B2028" stroke="#2B323C" strokeWidth={1} />
          {geo.states.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#323A46" strokeWidth={1} />
          ))}
          {geo.cells.map((c, i) => (
            <rect key={i} x={c.x + 1.5} y={c.y + 1.5} width={c.w - 3} height={c.h - 3} rx={4} fill={c.hit ? colorFor(perDecade) : "transparent"} fillOpacity={c.hit ? 0.92 : 0} stroke={c.hit ? "#ECEEF1" : "#2B323C"} strokeWidth={c.hit ? 1.5 : 1} />
          ))}
          {city && (
            <g transform={`translate(${city[0]} ${city[1]})`}>
              <circle r={7} fill="#EF5A4C" stroke="#0D1015" strokeWidth={2.5} />
            </g>
          )}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 bg-gradient-to-t from-[#161A21] via-[#161A21]/90 to-transparent p-5 pt-16">
        <div>
          <p className="label">This cell</p>
          <p className="mt-1 text-[14px] text-text tnum">
            {CELL_LAT}° × {CELL_LON}° ≈ {Math.round(kmLat)} × {Math.round(kmLon)} km
          </p>
          <p className="text-[12.5px] text-muted tnum">Center {coordText(cell.lat, cell.lon)}</p>
        </div>
        <div className="text-right">
          <p className="font-serif text-[40px] leading-none text-text tnum">
            <CountUp value={months} format={(v) => intLabel(v)} />
          </p>
          <p className="text-[12.5px] text-muted">
            monthly values, {from}-{to} · cell trend {signed(perDecade)}
          </p>
        </div>
      </div>
    </div>
  );
}

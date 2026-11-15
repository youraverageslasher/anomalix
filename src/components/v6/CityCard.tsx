import { colorFor } from "@/lib/data/color";
import { fixed, pLabel, signed } from "@/lib/data/fmt";
import { Stripes } from "./Stripes";
import type { Direction } from "@/lib/data/verdict";
import { VARIABLES, directionWord, type VariableCode } from "@/lib/data/variables";

export interface CityCardData {
  name: string;
  country: string;
  perDecade: number;
  ci95: number;
  p: number;
  inconclusive: boolean;
  direction: Direction;
  anomalies: { year: number; value: number }[];
  variable?: VariableCode;
}

const unitOf = (d: CityCardData) => `${VARIABLES[d.variable ?? "T2M"].unit}/decade`;
const isTemp = (d: CityCardData) => (d.variable ?? "T2M") === "T2M";
const digitsOf = (d: CityCardData) => VARIABLES[d.variable ?? "T2M"].digits;

function Tag({ d }: { d: CityCardData }) {
  return d.inconclusive ? (
    <span className="inline-flex h-[24px] items-center rounded-full border border-dashed border-highlight-border px-[9px] text-[11.5px] text-body">Inconclusive</span>
  ) : (
    <span className="inline-flex h-[24px] items-center rounded-full border border-rule px-[9px] text-[11.5px] text-body tnum">{pLabel(d.p)}</span>
  );
}

export function CityCard({ data, className = "" }: { data: CityCardData; className?: string }) {
  return (
    <article
      className={`card-hover w-[196px] rounded-card-sm border border-rule bg-card p-[14px] shadow-float ${className}`}
      aria-label={`${data.name}, ${data.country}: ${signed(data.perDecade, digitsOf(data))} ${unitOf(data)}, ${data.inconclusive ? "inconclusive" : pLabel(data.p)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-semibold leading-tight text-text">{data.name}</h3>
        <Tag d={data} />
      </div>
      <p className="mt-[2px] text-[12px] text-muted">{data.country}</p>
      <div className="mt-[10px] flex items-baseline gap-[6px]">
        <span aria-hidden className="inline-block h-[9px] w-[9px] rounded-[2px]" style={{ background: data.inconclusive || !isTemp(data) ? "#8D97A6" : colorFor(data.perDecade) }} />
        <span className="font-serif text-[34px] font-semibold leading-none text-text tnum">{signed(data.perDecade, digitsOf(data))}</span>
        <span className="text-[12px] text-muted">{unitOf(data)}</span>
      </div>
      {isTemp(data) && <Stripes anomalies={data.anomalies} height={14} className="mt-[12px]" />}
    </article>
  );
}

export function HighlightCard({ data, badge, className = "" }: { data: CityCardData; badge?: string; className?: string }) {
  return (
    <article
      className={`card-hover w-[214px] rounded-card-sm border border-highlight-border bg-highlight p-[14px] shadow-float ${className}`}
      aria-label={`${data.name}: ${signed(data.perDecade, digitsOf(data))} plus or minus ${fixed(data.ci95, digitsOf(data))} ${unitOf(data)}, ${pLabel(data.p)}, ${data.inconclusive ? "inconclusive" : directionWord(data.variable ?? "T2M", data.direction)}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-[13px] font-semibold leading-tight text-white">{data.name}</h3>
        {badge && <span className="inline-flex h-[22px] items-center rounded-[6px] border border-highlight-border px-[7px] text-[11px] font-semibold text-white">{badge}</span>}
      </div>
      <p className="mt-[2px] text-[11px] text-body">{data.country}</p>
      <div className="mt-[10px] flex items-baseline gap-[6px]">
        <span className="font-serif text-[34px] font-semibold leading-none text-white tnum">{signed(data.perDecade, digitsOf(data))}</span>
        <span className="text-[12px] text-body">{unitOf(data)}</span>
      </div>
      {isTemp(data) && <Stripes anomalies={data.anomalies} height={14} className="mt-[12px]" />}
      <p className="mt-[10px] text-[11.5px] text-body tnum">
        ± {fixed(data.ci95, digitsOf(data))} · {pLabel(data.p)} · {data.inconclusive ? "Inconclusive" : directionWord(data.variable ?? "T2M", data.direction)}
      </p>
    </article>
  );
}

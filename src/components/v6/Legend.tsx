import { BINS } from "@/lib/data/color";
import { signed } from "@/lib/data/fmt";
import grid from "../../../public/data/brazil-grid.json";

const ALL_POSITIVE = grid.states.every((s) => s.value > 0);

const TICKS = [0, 0.15, 0.3, 0.45, 0.6, 0.75];

export function Legend({ nationalMean, className = "" }: { nationalMean: number; className?: string }) {
  return (
    <div className={`w-full max-w-[300px] ${className}`}>
      <p className="text-[13px] font-medium text-text">Warming rate, °C per decade</p>
      <div className="mt-2 flex h-[12px] overflow-hidden rounded-[3px]" role="img" aria-label="Color scale from 0.00 to +0.75 °C per decade, blue to red">
        {BINS.map((c) => (
          <span key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>
      <div className="relative mt-1 h-[16px] text-[12px] text-muted tnum">
        {TICKS.map((t, i) => (
          <span
            key={t}
            className="absolute"
            style={{ left: `${(t / 0.75) * 100}%`, transform: i === 0 ? "none" : i === TICKS.length - 1 ? "translateX(-100%)" : "translateX(-50%)" }}
          >
            {i === 0 ? "0.00" : signed(t)}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-muted">
        Gray-white is the national mean ({signed(nationalMean)}). Blue means a slower trend than the mean, red faster.
        {ALL_POSITIVE ? " Every state's trend is positive." : ""}
      </p>
    </div>
  );
}

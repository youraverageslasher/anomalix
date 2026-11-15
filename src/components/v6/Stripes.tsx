"use client";

import { BASELINE_LABEL } from "@/lib/data/analyze";
import { stripeColor } from "@/lib/data/color";
import { useInView } from "./motion";

export function Stripes({
  anomalies,
  height = 14,
  className = "",
  rounded = 3,
  label,
}: {
  anomalies: { year: number; value: number }[];
  height?: number;
  className?: string;
  rounded?: number;
  label?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const n = anomalies.length;
  const key = anomalies.map((a) => a.value.toFixed(3)).join("|");
  const first = anomalies[0]?.year;
  const last = anomalies[n - 1]?.year;
  return (
    <div
      ref={ref}
      className={`overflow-hidden ${className}`}
      style={{ height, borderRadius: rounded }}
      role="img"
      aria-label={label ?? `Warming stripes, one per year from ${first} to ${last}, blue cooler and red warmer than the ${BASELINE_LABEL} mean`}
    >
      <svg key={key} viewBox={`0 0 ${n} 1`} preserveAspectRatio="none" width="100%" height="100%" className={inView ? "stripes-on" : "stripes-off"}>
        {anomalies.map((a, i) => (
          <rect key={a.year} x={i} y={0} width={1.02} height={1} fill={stripeColor(a.value)} style={{ animationDelay: `${i * 12}ms` }} className="stripe">
            <title>{`${a.year}: ${a.value >= 0 ? "+" : ""}${a.value.toFixed(2)} °C vs ${BASELINE_LABEL}`}</title>
          </rect>
        ))}
      </svg>
    </div>
  );
}

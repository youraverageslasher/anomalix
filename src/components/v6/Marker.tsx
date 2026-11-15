export type MarkerTone = "default" | "searched" | "inconclusive";

const TONE: Record<MarkerTone, string> = {
  default: "#ECEEF1",
  searched: "#EF5A4C",
  inconclusive: "#8D97A6",
};

export function markerColor(tone: MarkerTone) {
  return TONE[tone];
}

export function Marker({
  x,
  y,
  tone = "default",
  label,
  labelSide = "right",
  title,
}: {
  x: number;
  y: number;
  tone?: MarkerTone;
  label?: string;
  labelSide?: "right" | "left";
  title?: string;
}) {
  const c = TONE[tone];
  const w = label ? Math.round(label.length * 7.1 + 18) : 0;
  const lx = labelSide === "right" ? 16 : -16 - w;
  return (
    <g className="marker" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} role="img" aria-label={title ?? label}>
      {title && <title>{title}</title>}
      <circle className={`marker-halo ${tone === "searched" ? "halo-once" : ""}`} r={13} fill="none" stroke={c} strokeOpacity={0.45} strokeWidth={1} />
      <circle r={7} fill="none" stroke={c} strokeWidth={1} />
      <circle r={6} fill={c} stroke="#0D1015" strokeWidth={2.5} />
      {label && (
        <g transform={`translate(${lx} -12)`}>
          <rect width={w} height={24} rx={12} fill="#0D1015" stroke="#2B323C" strokeWidth={1} />
          <text x={w / 2} y={16} textAnchor="middle" fontSize={12} fontWeight={600} fill="#ECEEF1" style={{ fontFamily: "var(--font-sans)" }}>
            {label}
          </text>
        </g>
      )}
    </g>
  );
}

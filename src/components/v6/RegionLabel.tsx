export function RegionLabel({
  x,
  y,
  name,
  value,
  tone = "default",
  scale = 1,
}: {
  x: number | string;
  y: number | string;
  name: string;
  value: string;
  tone?: "default" | "on" | "off";
  scale?: number;
}) {
  const look =
    tone === "on"
      ? "border-text bg-text text-bg"
      : tone === "off"
        ? "border-[rgba(236,238,241,0.25)] bg-bg opacity-60"
        : "border-[rgba(236,238,241,0.55)] bg-bg";
  return (
    <div
      className={`region-tag pointer-events-none absolute whitespace-nowrap rounded-[8px] border px-[10px] py-[5px] text-center ${look}`}
      style={{ left: x, top: y, transform: `translate(-50%, -50%) scale(${scale})` }}
    >
      <div className={`text-[12px] leading-tight ${tone === "on" ? "text-bg/80" : "text-body"}`}>{name}</div>
      <div className={`font-serif text-[20px] leading-tight tnum ${tone === "on" ? "text-bg" : "text-text"}`}>{value}</div>
    </div>
  );
}

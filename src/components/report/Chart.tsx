"use client";

import dynamic from "next/dynamic";
import { echartsTheme } from "@/components/v6/echartsTheme";
import { usePrefersReducedMotion } from "@/components/v6/motion";

const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false, loading: () => <div className="h-full w-full" /> });

export const AXIS_TEXT = { color: "#8D97A6", fontSize: 11, fontFamily: "Inter, system-ui, sans-serif" };
export const GRID_LINE = { lineStyle: { color: "#2B323C", type: "dashed" as const } };
export const TOOLTIP = {
  backgroundColor: "#262E3A",
  borderColor: "#3B4656",
  textStyle: { color: "#ECEEF1", fontSize: 12 },
  axisPointer: { type: "cross" as const, lineStyle: { color: "#8D97A6", type: "dashed" as const }, crossStyle: { color: "#8D97A6" }, label: { backgroundColor: "#262E3A" } },
};

export function Chart({ option, label, height = 260 }: { option: Record<string, unknown>; label: string; height?: number }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full">
      <ReactECharts
        option={{ animation: !reduced, animationDuration: 1100, animationEasing: "cubicOut", ...option }}
        theme={echartsTheme}
        opts={{ renderer: "canvas" }}
        style={{ height: "100%", width: "100%" }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}

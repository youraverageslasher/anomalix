export const ANOMALIX_THEME = "anomalix-dark";

export const echartsTheme = {
  backgroundColor: "transparent",
  textStyle: { fontFamily: "Inter, system-ui, sans-serif", color: "#8D97A6", fontSize: 11 },
  color: ["#EF5A4C", "#ECEEF1", "#5C97EA", "#8D97A6"],
  grid: { left: 48, right: 16, top: 16, bottom: 28, containLabel: false },
  categoryAxis: {
    axisLine: { lineStyle: { color: "#2B323C" } },
    axisTick: { show: false },
    axisLabel: { color: "#8D97A6", fontSize: 11 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#8D97A6", fontSize: 11 },
    splitLine: { lineStyle: { color: "#2B323C", type: "dashed" } },
  },
  line: { lineStyle: { width: 2.4 }, symbol: "none" },
  tooltip: {
    backgroundColor: "#262E3A",
    borderColor: "#3B4656",
    textStyle: { color: "#ECEEF1", fontSize: 12 },
  },
};

export const SERIES = {
  city: { lineStyle: { color: "#EF5A4C", width: 2.4 }, itemStyle: { color: "#EF5A4C" } },
  context: { lineStyle: { color: "#ECEEF1", width: 1.6 }, itemStyle: { color: "#ECEEF1" } },
};

let registered = false;
export async function registerAnomalixTheme() {
  if (registered) return;
  const echarts = await import("echarts");
  echarts.registerTheme(ANOMALIX_THEME, echartsTheme);
  registered = true;
}

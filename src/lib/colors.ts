export type ColorMetric = "exposure" | "adoption" | "outlook";

export function scoreColor(value: number | null): string {
  if (value == null) return "#c5c1b7";
  const t = Math.max(0, Math.min(1, value / 10));
  const stops: Array<[number, number, number]> = [
    [215, 235, 230],
    [61, 138, 128],
    [11, 63, 60],
  ];
  const [from, to] = t < 0.5 ? [stops[0], stops[1]] : [stops[1], stops[2]];
  const u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * u);
  return `rgb(${mix(from[0], to[0])},${mix(from[1], to[1])},${mix(from[2], to[2])})`;
}

export function outlookColor(outlook: string): string {
  switch (outlook) {
    case "shortage":
      return "#1d4e89";
    case "surplus":
      return "#9a5b1a";
    case "balanced":
      return "#4a5d4e";
    case "mismatch":
      return "#5c4d7a";
    default:
      return "#c5c1b7";
  }
}

export function metricColor(
  metric: ColorMetric,
  occupation: {
    theoreticalAIExposure: number | null;
    currentAIAdoption: number | null;
    laborMarketOutlook: string;
  },
): string {
  if (metric === "exposure") return scoreColor(occupation.theoreticalAIExposure);
  if (metric === "adoption") return scoreColor(occupation.currentAIAdoption);
  return outlookColor(occupation.laborMarketOutlook);
}

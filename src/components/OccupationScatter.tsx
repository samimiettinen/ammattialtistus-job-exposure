"use client";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useLocale, useTranslations } from "next-intl";
import { scoreColor } from "@/lib/colors";
import type { Occupation } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";
import { occupationName } from "@/lib/utils";

export function OccupationScatter({ occupations }: { occupations: Occupation[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const selectedCode = useVisualizerStore((state) => state.selectedCode);
  const setFilters = useVisualizerStore((state) => state.setFilters);
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const points = occupations
    .filter((row) => row.theoreticalAIExposure != null && row.currentAIAdoption != null)
    .map((row) => ({
      value: [row.theoreticalAIExposure, row.currentAIAdoption, row.employedPersons ?? 500],
      name: `${row.occupationCode} ${occupationName(row, locale)}`,
      code: row.occupationCode,
      itemStyle: {
        color: scoreColor(row.theoreticalAIExposure),
        borderColor: row.occupationCode === selectedCode ? "#1c2430" : "transparent",
        borderWidth: row.occupationCode === selectedCode ? 2 : 0,
      },
    }));

  const option: EChartsOption = {
    animation: !reduceMotion,
    grid: { left: 48, right: 16, top: 24, bottom: 48 },
    xAxis: { min: 0, max: 10, name: t("chart.x"), nameLocation: "middle", nameGap: 28 },
    yAxis: { min: 0, max: 10, name: t("chart.y") },
    tooltip: {
      formatter: (params: unknown) => {
        const item = params as { name: string; value: number[] };
        return `${item.name}<br/>${t("chart.x")}: ${item.value[0]}<br/>${t("chart.y")}: ${item.value[1]}`;
      },
    },
    series: [
      {
        type: "scatter",
        symbolSize: (value: number[]) => Math.max(8, Math.sqrt(value[2] ?? 1) / 8),
        data: points,
      },
    ],
  };

  return (
    <div aria-label={t("chart.scatter")} className="min-h-[360px] rounded-lg border border-[#d8d2c6] bg-white">
      <ReactECharts
        option={option}
        style={{ height: 420, width: "100%" }}
        onEvents={{
          click: (params: { data?: { code?: string } }) => {
            if (params.data?.code) setFilters({ selectedCode: params.data.code });
          },
        }}
      />
    </div>
  );
}

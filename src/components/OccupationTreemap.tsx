"use client";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useLocale, useTranslations } from "next-intl";
import { metricColor } from "@/lib/colors";
import type { Occupation } from "@/lib/schemas";
import { tabToMetric, useVisualizerStore } from "@/lib/store";
import { occupationName } from "@/lib/utils";

export function OccupationTreemap({ occupations }: { occupations: Occupation[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const tab = useVisualizerStore((state) => state.tab);
  const selectedCode = useVisualizerStore((state) => state.selectedCode);
  const setFilters = useVisualizerStore((state) => state.setFilters);
  const metric = tabToMetric(tab);
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const children = occupations
    .filter((row) => (row.employedPersons ?? 0) > 0)
    .map((row) => ({
      name: `${row.occupationCode} ${occupationName(row, locale)}`,
      value: row.employedPersons ?? 0,
      code: row.occupationCode,
      itemStyle: {
        color: metricColor(metric, row),
        borderColor: row.occupationCode === selectedCode ? "#1c2430" : "#f4f1ea",
        borderWidth: row.occupationCode === selectedCode ? 2 : 1,
      },
    }));

  const option: EChartsOption = {
    animation: !reduceMotion,
    tooltip: {
      formatter: (params: unknown) => {
        const item = params as { name: string; value: number };
        return `${item.name}<br/>${item.value.toLocaleString(locale)}`;
      },
    },
    series: [
      {
        type: "treemap",
        roam: true,
        breadcrumb: { show: false },
        nodeClick: false,
        data: children,
        label: {
          show: true,
          formatter: "{b}",
          color: "#1c2430",
          fontSize: 11,
        },
        upperLabel: { show: false },
      },
    ],
  };

  return (
    <div aria-label={t("chart.treemap")} className="min-h-[360px] rounded-lg border border-[#d8d2c6] bg-white">
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

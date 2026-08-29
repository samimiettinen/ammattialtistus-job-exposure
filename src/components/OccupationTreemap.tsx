"use client";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { useLocale, useTranslations } from "next-intl";
import {
  dataAvailabilityStatus,
  displayValue,
  escapeHtml,
  firstSentence,
  scoreBand,
} from "@/lib/occupation-view";
import type { Occupation } from "@/lib/schemas";
import { tabToMetric, useVisualizerStore } from "@/lib/store";
import { buildTreemapHierarchy, shouldShowTreemapLabel, type HierarchyLabel } from "@/lib/treemap-data";
import { formatNumber, occupationName } from "@/lib/utils";

export function OccupationTreemap({
  occupations,
  hierarchy,
}: {
  occupations: Occupation[];
  hierarchy: HierarchyLabel[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const tab = useVisualizerStore((state) => state.tab);
  const selectedCode = useVisualizerStore((state) => state.selectedCode);
  const setFilters = useVisualizerStore((state) => state.setFilters);
  const metric = tabToMetric(tab);
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const byCode = new Map(occupations.map((row) => [row.occupationCode, row]));
  const unavailable = t("common.unavailable");

  const data = buildTreemapHierarchy({
    occupations,
    hierarchy,
    locale,
    metric,
    selectedCode,
  });

  const option: EChartsOption = {
    animation: !reduceMotion,
    tooltip: {
      formatter: (params: unknown) => {
        const item = params as { name?: string; value?: number; data?: { code?: string; occupation?: boolean } };
        const occupation = item.data?.code ? byCode.get(item.data.code) : undefined;
        if (!occupation || !item.data?.occupation) {
          return `${escapeHtml(item.name ?? "")}<br/>${displayValue(item.value ?? null, unavailable, (value) =>
            formatNumber(Number(value), locale),
          )}`;
        }
        const score =
          metric === "adoption"
            ? occupation.currentAIAdoption
            : metric === "outlook"
              ? null
              : occupation.theoreticalAIExposure;
        const scoreText =
          metric === "outlook"
            ? occupation.laborMarketOutlook === "unavailable"
              ? unavailable
              : t(`outlook.${occupation.laborMarketOutlook}`)
            : displayValue(score, unavailable);
        const meaning =
          metric !== "outlook" && score != null
            ? t(`scoreMeaning.${metric === "adoption" ? "adoption" : "exposure"}.${scoreBand(score)}`)
            : unavailable;
        const rationale = firstSentence(
          metric === "adoption" ? occupation.adoptionRationale : occupation.exposureRationale,
        );
        const availability = dataAvailabilityStatus(occupation);
        const availabilityKey = {
          complete: "availabilityComplete",
          unscored: "availabilityUnscored",
          fixture: "availabilityFixture",
          missingEmployment: "availabilityMissingEmployment",
          missingOutlook: "availabilityMissingOutlook",
          partial: "availabilityPartial",
        }[availability];
        return [
          `<strong>${escapeHtml(occupationName(occupation, locale))}</strong>`,
          `${t("tooltip.employed")}: ${displayValue(occupation.employedPersons, unavailable, (value) => formatNumber(Number(value), locale))}`,
          `${t("tooltip.score")}: ${escapeHtml(scoreText)} — ${escapeHtml(meaning)}`,
          `${t("tooltip.uncertainty")}: ${occupation.uncertainty ? t(`uncertainty.${occupation.uncertainty}`) : unavailable}`,
          `${t("tooltip.rationale")}: ${escapeHtml(rationale ?? unavailable)}`,
          `${t("tooltip.availability")}: ${escapeHtml(t(`tooltip.${availabilityKey}`))}`,
        ].join("<br/>");
      },
    },
    series: [
      {
        type: "treemap",
        roam: true,
        leafDepth: 1,
        nodeClick: "zoomToNode",
        breadcrumb: {
          show: true,
          height: 28,
          itemStyle: { color: "#0f5c5c", textStyle: { color: "#fff" } },
        },
        data,
        label: {
          show: true,
          formatter: "{b}",
          color: "#1c2430",
          fontSize: 11,
        },
        labelLayout: (params) => {
          const fits = shouldShowTreemapLabel(
            "x".repeat(Math.max(1, Math.round(params.labelRect.width / (11 * 0.62)))),
            params.rect.width,
            params.rect.height,
          );
          const measuredFits =
            params.labelRect.width <= params.rect.width - 8 && params.labelRect.height <= params.rect.height - 8;
          return fits && measuredFits ? {} : { x: -10000, y: -10000 };
        },
        upperLabel: { show: false },
      },
    ],
  };

  return (
    <div aria-label={t("chart.treemap")} className="min-h-[360px] rounded-lg border border-[#d8d2c6] bg-white">
      <ReactECharts
        option={option}
        style={{ height: 460, width: "100%" }}
        onEvents={{
          click: (params: { data?: { code?: string; occupation?: boolean } }) => {
            if (params.data?.occupation && params.data.code) {
              setFilters({ selectedCode: params.data.code });
            }
          },
        }}
      />
    </div>
  );
}

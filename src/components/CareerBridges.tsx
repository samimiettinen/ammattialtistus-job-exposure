"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { buildCareerBridges } from "@/lib/bridges";
import { displayValue } from "@/lib/occupation-view";
import type { Occupation } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";
import { occupationName } from "@/lib/utils";

export function CareerBridges({
  occupation,
  catalog,
}: {
  occupation: Occupation;
  catalog: Occupation[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const setFilters = useVisualizerStore((state) => state.setFilters);
  const toggleCompare = useVisualizerStore((state) => state.toggleCompare);
  const result = useMemo(() => buildCareerBridges(occupation, catalog), [occupation, catalog]);
  const unavailable = t("common.unavailable");

  return (
    <section className="mt-4 rounded border border-[#d8d2c6] p-3">
      <h3 className="font-semibold text-[#0b3f3c]">{t("bridges.title")}</h3>
      <p className="mt-1 text-xs text-[#5c6570]">{t("bridges.calculated")}</p>
      <p className="mt-1 text-xs text-[#5c6570]">{t("bridges.explainUnavailable")}</p>
      <p className="mt-1 text-xs text-[#5c6570]">{t("bridges.noSalary")}</p>
      {result.bridges.length === 0 ? (
        <p className="mt-2 text-sm text-[#5c6570]">{t("bridges.empty")}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {result.bridges.map((bridge) => (
            <li key={bridge.occupationCode} className="rounded border border-[#efe9de] p-2 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                  type="button"
                  className="text-left text-[#0f5c5c] underline-offset-2 hover:underline"
                  onClick={() => setFilters({ selectedCode: bridge.occupationCode })}
                >
                  <span className="font-mono text-xs">{bridge.occupationCode}</span>{" "}
                  {occupationName(bridge, locale)}
                </button>
                <button
                  type="button"
                  className="rounded border border-[#0f5c5c] px-2 py-1 text-xs text-[#0f5c5c]"
                  onClick={() => toggleCompare(bridge.occupationCode)}
                >
                  {t("compare.action")}
                </button>
              </div>
              <p>
                {t("bridges.overlap")}: {Math.round(bridge.overlap * 100)} %
              </p>
              <p>
                {t("detail.exposure")}: {displayValue(bridge.theoreticalAIExposure, unavailable)} ·{" "}
                {t("detail.outlook")}:{" "}
                {bridge.laborMarketOutlook === "unavailable"
                  ? unavailable
                  : t(`outlook.${bridge.laborMarketOutlook}`)}{" "}
                · {t("detail.uncertainty")}:{" "}
                {bridge.uncertainty ? t(`uncertainty.${bridge.uncertainty}`) : unavailable}
              </p>
              <p>
                {t("bridges.retained")}:{" "}
                {bridge.retainedSkills.length ? bridge.retainedSkills.join(" · ") : unavailable}
              </p>
              <p>
                {t("bridges.missing")}:{" "}
                {bridge.missingSkills.length ? bridge.missingSkills.join(" · ") : unavailable}
              </p>
              <p className="text-xs text-[#5c6570]">
                {t("bridges.why")}: {bridge.reasons.map((reason) => t(`bridges.${reason}`)).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

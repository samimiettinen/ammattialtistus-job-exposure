"use client";

import { useLocale, useTranslations } from "next-intl";
import { displayValue } from "@/lib/occupation-view";
import type { Occupation } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";
import { formatNumber, occupationName } from "@/lib/utils";

export function OccupationListbox({ occupations }: { occupations: Occupation[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const selectedCode = useVisualizerStore((state) => state.selectedCode);
  const setFilters = useVisualizerStore((state) => state.setFilters);
  const unavailable = t("common.unavailable");
  const sorted = occupations
    .slice()
    .sort((a, b) => occupationName(a, locale).localeCompare(occupationName(b, locale), locale));

  return (
    <details className="rounded-lg border border-[#d8d2c6] bg-white p-3" open={occupations.length <= 40}>
      <summary className="cursor-pointer text-sm font-semibold text-[#0b3f3c]">{t("chart.listToggle")}</summary>
      <label className="mt-2 block text-sm">
        <span className="sr-only">{t("chart.list")}</span>
        <select
          aria-label={t("chart.list")}
          size={Math.min(12, Math.max(4, sorted.length))}
          value={selectedCode}
          className="mt-1 w-full rounded border border-[#d8d2c6] bg-white px-2 py-1 text-sm"
          onChange={(event) => setFilters({ selectedCode: event.target.value })}
        >
          <option value="">{t("detail.select")}</option>
          {sorted.map((row) => (
            <option key={row.occupationCode} value={row.occupationCode}>
              {row.occupationCode} {occupationName(row, locale)} —{" "}
              {displayValue(row.employedPersons, unavailable, (value) => formatNumber(Number(value), locale))}
            </option>
          ))}
        </select>
      </label>
    </details>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { PresetId } from "@/lib/presets";
import type { Occupation } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";

const OUTLOOKS = ["shortage", "surplus", "balanced", "mismatch", "unavailable"] as const;
const PRESETS: Array<{ id: PresetId; key: "presetLargest" | "presetHighExposure" | "presetUnusedPotential" | "presetShortage" }> = [
  { id: "largest", key: "presetLargest" },
  { id: "high_exposure", key: "presetHighExposure" },
  { id: "unused_potential", key: "presetUnusedPotential" },
  { id: "shortage", key: "presetShortage" },
];

export function FilterBar({
  groups,
  resultCount,
}: {
  groups: Array<{ code: string; name: string }>;
  resultCount: number;
}) {
  const t = useTranslations();
  const store = useVisualizerStore();

  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 rounded-lg border-2 border-[#0f5c5c] bg-white p-3 text-sm">
        <span className="font-semibold text-[#0b3f3c]">{t("filters.search")}</span>
        <input
          type="search"
          value={store.q}
          onChange={(event) => store.setFilters({ q: event.target.value })}
          className="rounded border border-[#d8d2c6] bg-white px-3 py-3 text-base"
          aria-describedby="occupation-search-hint"
        />
        <span id="occupation-search-hint" className="text-xs text-[#5c6570]">
          {t("filters.searchHint")}
        </span>
      </label>

      <div role="group" aria-label={t("filters.presets")} className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const active = store.preset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              className={`rounded px-3 py-2 text-sm ${
                active ? "bg-[#0f5c5c] text-white" : "border border-[#0f5c5c] text-[#0f5c5c]"
              }`}
              onClick={() => store.setPreset(active ? "" : preset.id)}
            >
              {t(`filters.${preset.key}`)}
            </button>
          );
        })}
      </div>

      <details className="rounded-lg border border-[#d8d2c6] bg-white/70 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#0b3f3c]">{t("filters.advanced")}</summary>
        <form className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("filters.group")}</span>
            <select
              value={store.group}
              onChange={(event) => store.setAdvancedFilters({ group: event.target.value })}
              className="rounded border border-[#d8d2c6] bg-white px-3 py-2"
            >
              <option value="">{t("filters.allGroups")}</option>
              {groups.map((group) => (
                <option key={group.code} value={group.code}>
                  {group.code} {group.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("filters.outlook")}</span>
            <select
              value={store.outlook}
              onChange={(event) =>
                store.setAdvancedFilters({
                  outlook: event.target.value as Occupation["laborMarketOutlook"] | "",
                })
              }
              className="rounded border border-[#d8d2c6] bg-white px-3 py-2"
            >
              <option value="">{t("filters.allOutlooks")}</option>
              {OUTLOOKS.map((value) => (
                <option key={value} value={value}>
                  {t(`outlook.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("filters.employment")}</span>
            <select
              value={store.minEmployment ?? ""}
              onChange={(event) =>
                store.setAdvancedFilters({
                  minEmployment: event.target.value ? Number(event.target.value) : null,
                })
              }
              className="rounded border border-[#d8d2c6] bg-white px-3 py-2"
            >
              <option value="">{t("filters.anySize")}</option>
              <option value="1000">≥ 1 000</option>
              <option value="5000">≥ 5 000</option>
              <option value="20000">≥ 20 000</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t("filters.scoreStatus")}</span>
            <select
              value={store.scoreStatus}
              onChange={(event) =>
                store.setAdvancedFilters({
                  scoreStatus: event.target.value as typeof store.scoreStatus,
                })
              }
              className="rounded border border-[#d8d2c6] bg-white px-3 py-2"
            >
              <option value="all">{t("filters.allScores")}</option>
              <option value="scored">{t("filters.scored")}</option>
              <option value="unscored">{t("filters.unscored")}</option>
              <option value="fixture">{t("filters.fixture")}</option>
            </select>
          </label>
          <div className="flex items-end justify-between gap-3 text-sm md:col-span-2">
            <p aria-live="polite">{t("filters.results", { count: resultCount })}</p>
            <Button type="button" variant="outline" onClick={() => store.reset()}>
              {t("filters.reset")}
            </Button>
          </div>
        </form>
      </details>
    </div>
  );
}

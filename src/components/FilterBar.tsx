"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { Occupation } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";

const OUTLOOKS = ["shortage", "surplus", "balanced", "mismatch", "unavailable"] as const;

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
    <form className="grid gap-3 rounded-lg border border-[#d8d2c6] bg-white/70 p-3 md:grid-cols-2 lg:grid-cols-3">
      <label className="flex flex-col gap-1 text-sm">
        <span>{t("filters.search")}</span>
        <input
          type="search"
          value={store.q}
          onChange={(event) => store.setFilters({ q: event.target.value })}
          className="rounded border border-[#d8d2c6] bg-white px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>{t("filters.group")}</span>
        <select
          value={store.group}
          onChange={(event) => store.setFilters({ group: event.target.value })}
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
            store.setFilters({ outlook: event.target.value as Occupation["laborMarketOutlook"] | "" })
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
            store.setFilters({
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
            store.setFilters({ scoreStatus: event.target.value as typeof store.scoreStatus })
          }
          className="rounded border border-[#d8d2c6] bg-white px-3 py-2"
        >
          <option value="all">{t("filters.allScores")}</option>
          <option value="scored">{t("filters.scored")}</option>
          <option value="unscored">{t("filters.unscored")}</option>
          <option value="fixture">{t("filters.fixture")}</option>
        </select>
      </label>
      <div className="flex items-end justify-between gap-3 text-sm">
        <p aria-live="polite">{t("filters.results", { count: resultCount })}</p>
        <Button type="button" variant="outline" onClick={() => store.reset()}>
          {t("filters.reset")}
        </Button>
      </div>
    </form>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { filterOccupations } from "@/lib/pipeline/filters";
import type { Occupation, OccupationQuery } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";
import { DetailPanel } from "./DetailPanel";
import { FilterBar } from "./FilterBar";
import { UrlStateSync } from "./UrlStateSync";

const OccupationTreemap = dynamic(
  () => import("./OccupationTreemap").then((mod) => mod.OccupationTreemap),
  { ssr: false },
);
const OccupationScatter = dynamic(
  () => import("./OccupationScatter").then((mod) => mod.OccupationScatter),
  { ssr: false },
);

export function Visualizer({
  occupations,
  groups,
}: {
  occupations: Occupation[];
  groups: Array<{ code: string; name: string }>;
}) {
  const t = useTranslations();
  const store = useVisualizerStore();

  const query: OccupationQuery = {
    q: store.q || undefined,
    group: store.group || undefined,
    outlook: store.outlook || undefined,
    minEmployment: store.minEmployment ?? undefined,
    scoreStatus:
      store.scoreStatus === "all"
        ? undefined
        : store.scoreStatus === "scored"
          ? "scored"
          : store.scoreStatus,
    level: 4,
  };
  const filtered = useMemo(() => filterOccupations(occupations, query), [occupations, query]);
  const selected = occupations.find((row) => row.occupationCode === store.selectedCode) ?? null;

  return (
    <div className="space-y-4">
      <UrlStateSync />
      <div role="tablist" aria-label="Näkymä" className="flex flex-wrap gap-2">
        {(["exposure", "adoption", "outlook"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={store.tab === tab}
            className={`rounded px-3 py-2 text-sm ${
              store.tab === tab ? "bg-[#0f5c5c] text-white" : "border border-[#0f5c5c] text-[#0f5c5c]"
            }`}
            onClick={() => store.setFilters({ tab })}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>
      <FilterBar groups={groups} resultCount={filtered.length} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-4">
          <OccupationTreemap occupations={filtered} />
          <OccupationScatter occupations={filtered} />
        </div>
        <DetailPanel occupation={selected} />
      </div>
    </div>
  );
}

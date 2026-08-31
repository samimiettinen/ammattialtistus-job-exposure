"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { filterOccupations } from "@/lib/pipeline/filters";
import { residualEmploymentNotice } from "@/lib/occupation-view";
import type { CuratedProfile, Occupation, OccupationQuery } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";
import type { HierarchyLabel } from "@/lib/treemap-data";
import { buildViewSummary } from "@/lib/view-summary";
import { ComparisonCard } from "./ComparisonCard";
import { DataQualityNotice } from "./DataQualityNotice";
import { DetailPanel } from "./DetailPanel";
import { FilterBar } from "./FilterBar";
import { MarketComposition } from "./MarketComposition";
import { OccupationListbox } from "./OccupationListbox";
import { SearchResults } from "./SearchResults";
import { UrlStateSync } from "./UrlStateSync";
import { ViewSummary } from "./ViewSummary";
import { WorkdayPanel } from "./WorkdayPanel";

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
  hierarchy,
  catalog,
  curatedProfiles,
}: {
  occupations: Occupation[];
  groups: Array<{ code: string; name: string }>;
  hierarchy: HierarchyLabel[];
  catalog: Occupation[];
  curatedProfiles: CuratedProfile[];
}) {
  const t = useTranslations();
  const store = useVisualizerStore();

  const filtered = useMemo(() => {
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
      preset: store.preset || undefined,
      level: 4,
    };
    return filterOccupations(occupations, query);
  }, [
    occupations,
    store.q,
    store.group,
    store.outlook,
    store.minEmployment,
    store.scoreStatus,
    store.preset,
  ]);
  const selected = catalog.find((row) => row.occupationCode === store.selectedCode) ?? null;
  const summary = useMemo(() => buildViewSummary(filtered), [filtered]);
  const residual = residualEmploymentNotice(catalog);

  return (
    <div className="space-y-4">
      <UrlStateSync />
      <WorkdayPanel catalog={occupations} />
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
      <SearchResults occupations={filtered} />
      <ComparisonCard catalog={occupations} />
      <ViewSummary summary={summary} />
      <MarketComposition occupations={filtered} hierarchy={hierarchy} />
      <DataQualityNotice
        code={residual.code}
        employedPersons={residual.employedPersons}
        employmentDataYear={residual.employmentDataYear}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
        <div className="space-y-4">
          <OccupationTreemap occupations={filtered} hierarchy={hierarchy} />
          <OccupationListbox occupations={filtered} />
          <OccupationScatter occupations={filtered} />
        </div>
        <DetailPanel occupation={selected} catalog={occupations} curatedProfiles={curatedProfiles} />
      </div>
    </div>
  );
}

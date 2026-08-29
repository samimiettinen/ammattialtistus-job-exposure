"use client";

import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useRef } from "react";
import { parseCompareParam, serializeCompareParam } from "@/lib/comparison";
import { isPresetId } from "@/lib/presets";
import { useVisualizerStore, type VisualizerTab } from "@/lib/store";

const tabs = ["exposure", "adoption", "outlook"] as const;

export function UrlStateSync() {
  const store = useVisualizerStore();
  const skip = useRef(false);
  const [params, setParams] = useQueryStates({
    q: parseAsString.withDefault(""),
    group: parseAsString.withDefault(""),
    outlook: parseAsString.withDefault(""),
    emp: parseAsString.withDefault(""),
    scores: parseAsString.withDefault("all"),
    code: parseAsString.withDefault(""),
    tab: parseAsStringLiteral(tabs).withDefault("exposure"),
    preset: parseAsString.withDefault(""),
    compare: parseAsString.withDefault(""),
  });

  useEffect(() => {
    skip.current = true;
    store.setFilters({
      q: params.q,
      group: params.group,
      outlook: (params.outlook || "") as typeof store.outlook,
      minEmployment: params.emp ? Number(params.emp) : null,
      scoreStatus: (params.scores as typeof store.scoreStatus) || "all",
      selectedCode: params.code,
      tab: params.tab as VisualizerTab,
      preset: isPresetId(params.preset) ? params.preset : "",
      compareCodes: parseCompareParam(params.compare),
    });
  }, [
    params.q,
    params.group,
    params.outlook,
    params.emp,
    params.scores,
    params.code,
    params.tab,
    params.preset,
    params.compare,
  ]);

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    void setParams({
      q: store.q || null,
      group: store.group || null,
      outlook: store.outlook || null,
      emp: store.minEmployment != null ? String(store.minEmployment) : null,
      scores: store.scoreStatus === "all" ? null : store.scoreStatus,
      code: store.selectedCode || null,
      tab: store.tab,
      preset: store.preset || null,
      compare: serializeCompareParam(store.compareCodes),
    });
  }, [
    store.q,
    store.group,
    store.outlook,
    store.minEmployment,
    store.scoreStatus,
    store.selectedCode,
    store.tab,
    store.preset,
    store.compareCodes,
    setParams,
  ]);

  return null;
}

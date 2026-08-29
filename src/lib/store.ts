import { create } from "zustand";
import type { ColorMetric } from "./colors";
import type { PresetId } from "./presets";
import type { LaborMarketOutlook } from "./schemas";

export type VisualizerTab = "exposure" | "adoption" | "outlook";

export type FilterState = {
  q: string;
  group: string;
  outlook: LaborMarketOutlook | "";
  minEmployment: number | null;
  scoreStatus: "all" | "scored" | "unscored" | "fixture";
  selectedCode: string;
  tab: VisualizerTab;
  preset: PresetId | "";
};

const defaults: FilterState = {
  q: "",
  group: "",
  outlook: "",
  minEmployment: null,
  scoreStatus: "all",
  selectedCode: "",
  tab: "exposure",
  preset: "",
};

type Store = FilterState & {
  setFilters: (patch: Partial<FilterState>) => void;
  setAdvancedFilters: (patch: Partial<FilterState>) => void;
  setPreset: (preset: PresetId | "") => void;
  reset: () => void;
};

export const useVisualizerStore = create<Store>((set) => ({
  ...defaults,
  setFilters: (patch) => set(patch),
  setAdvancedFilters: (patch) => set({ ...patch, preset: "" }),
  setPreset: (preset) =>
    set({
      preset,
      group: "",
      outlook: "",
      minEmployment: null,
      scoreStatus: "all",
    }),
  reset: () => set(defaults),
}));

export function tabToMetric(tab: VisualizerTab): ColorMetric {
  if (tab === "adoption") return "adoption";
  if (tab === "outlook") return "outlook";
  return "exposure";
}

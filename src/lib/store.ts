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
  compareCodes: string[];
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
  compareCodes: [],
};

type Store = FilterState & {
  setFilters: (patch: Partial<FilterState>) => void;
  setAdvancedFilters: (patch: Partial<FilterState>) => void;
  setPreset: (preset: PresetId | "") => void;
  toggleCompare: (code: string) => void;
  clearCompare: () => void;
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
  toggleCompare: (code) =>
    set((state) => {
      if (state.compareCodes.includes(code)) {
        return { compareCodes: state.compareCodes.filter((item) => item !== code) };
      }
      if (state.compareCodes.length >= 4) return {};
      return { compareCodes: [...state.compareCodes, code] };
    }),
  clearCompare: () => set({ compareCodes: [] }),
  reset: () => set(defaults),
}));

export function tabToMetric(tab: VisualizerTab): ColorMetric {
  if (tab === "adoption") return "adoption";
  if (tab === "outlook") return "outlook";
  return "exposure";
}

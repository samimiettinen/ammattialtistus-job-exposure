import { groupCodeAtLevel } from "./pipeline/classification";
import {
  HIGH_THEORETICAL_EXPOSURE_MIN,
  LARGEST_GROUP_COUNT,
  UNUSED_POTENTIAL_MIN_GAP,
} from "./occupation-view";
import type { Occupation } from "./schemas";

export const PRESET_IDS = ["largest", "high_exposure", "unused_potential", "shortage"] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export function isPresetId(value: string): value is PresetId {
  return (PRESET_IDS as readonly string[]).includes(value);
}

export function twoDigitGroupCode(occupation: Occupation): string {
  return groupCodeAtLevel(occupation.occupationCode, 2);
}

export function largestGroupCodes(
  occupations: Occupation[],
  limit = LARGEST_GROUP_COUNT,
): string[] {
  const totals = new Map<string, number>();
  for (const row of occupations) {
    const group = twoDigitGroupCode(row);
    totals.set(group, (totals.get(group) ?? 0) + (row.employedPersons ?? 0));
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([code]) => code);
}

export function matchesUnusedPotential(occupation: Occupation): boolean {
  const exposure = occupation.theoreticalAIExposure;
  const adoption = occupation.currentAIAdoption;
  if (exposure == null || adoption == null) return false;
  return exposure >= HIGH_THEORETICAL_EXPOSURE_MIN && exposure - adoption >= UNUSED_POTENTIAL_MIN_GAP;
}

export function applyPreset(
  occupations: Occupation[],
  preset: PresetId | "" | undefined,
  universe: Occupation[] = occupations,
): Occupation[] {
  if (!preset) return occupations;
  if (preset === "largest") {
    const groups = new Set(largestGroupCodes(universe));
    return occupations.filter((row) => groups.has(twoDigitGroupCode(row)));
  }
  if (preset === "high_exposure") {
    return occupations.filter(
      (row) =>
        row.theoreticalAIExposure != null && row.theoreticalAIExposure >= HIGH_THEORETICAL_EXPOSURE_MIN,
    );
  }
  if (preset === "unused_potential") {
    return occupations.filter(matchesUnusedPotential);
  }
  return occupations.filter((row) => row.laborMarketOutlook === "shortage");
}

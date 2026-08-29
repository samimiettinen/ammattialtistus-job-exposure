import { HIGH_THEORETICAL_EXPOSURE_MIN } from "./occupation-view";
import type { Occupation } from "./schemas";

export type ViewSummary = {
  occupationCount: number;
  workerCount: number;
  scoredCount: number;
  highExposureShare: number | null;
};

export function buildViewSummary(occupations: Occupation[]): ViewSummary {
  const workerCount = occupations.reduce((sum, row) => sum + (row.employedPersons ?? 0), 0);
  const scored = occupations.filter((row) => row.theoreticalAIExposure != null);
  const highWorkers = occupations
    .filter(
      (row) =>
        row.theoreticalAIExposure != null && row.theoreticalAIExposure >= HIGH_THEORETICAL_EXPOSURE_MIN,
    )
    .reduce((sum, row) => sum + (row.employedPersons ?? 0), 0);

  return {
    occupationCount: occupations.length,
    workerCount,
    scoredCount: scored.length,
    highExposureShare: scored.length === 0 || workerCount === 0 ? null : highWorkers / workerCount,
  };
}

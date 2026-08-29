import type { Occupation } from "../schemas/occupation";
import { buildCatalogCoverageReport, buildCoverageReport } from "./report";
import type { CatalogCoverageReport } from "../schemas/coverage";

export function assertNoInventedOfficialStats(occupation: Occupation): void {
  const report = buildCoverageReport(occupation);
  if (report.inventedOfficialStats) {
    throw new Error("invented_official_stats");
  }
}

export function runCoverageGates(occupations: Occupation[]): CatalogCoverageReport {
  return buildCatalogCoverageReport(occupations);
}

export function gateErrors(occupations: Occupation[]): string[] {
  return runCoverageGates(occupations).errors;
}

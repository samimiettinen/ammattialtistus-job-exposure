import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCatalogCoverageReport, buildCoverageReport } from "../src/lib/coverage/report";
import { validateOccupations } from "../src/lib/pipeline/validate";
import { parseLlmScoreResponse } from "../src/lib/scoring/parse";
import { mergedCatalogFileSchema } from "../src/lib/schemas";
import { testOccupation } from "./helpers";

describe("coverage reports and validation gates", () => {
  it("builds a partial coverage report when official outlook and explicit skills are missing", () => {
    const occupation = testOccupation("2512", {
      laborMarketOutlook: "unavailable",
      recommendedSkills: [],
      employedPersons: 1000,
      employmentStale: true,
    });
    const report = buildCoverageReport(occupation);
    expect(report.inventedOfficialStats).toBe(false);
    expect(report.fields.officialOutlook.status).toBe("unavailable");
    expect(report.fields.skills.status).toBe("inferred_from_tasks");
    expect(report.missingEvidence).toContain("officialOutlook");
    expect(report.missingEvidence).toContain("explicitSkills");
    expect(report.completeness).toBeGreaterThan(0);
    expect(report.completeness).toBeLessThan(1);
  });

  it("marks a full evidence row complete enough for situation assessment", () => {
    const occupation = testOccupation("2512", {
      recommendedSkills: ["dokumentointi", "koordinointi"],
      laborMarketOutlook: "surplus",
      outlookStale: false,
      employmentStale: false,
      uncertainty: "low",
    });
    const report = buildCoverageReport(occupation);
    expect(report.fields.skills.status).toBe("present");
    expect(report.sufficientForSituation).toBe(true);
    expect(report.sufficientForBridges).toBe(true);
  });

  it("rejects a catalog that invents official stats or fakes every visual score", () => {
    const invented = testOccupation("2512", { employedPersons: 10, employmentDataYear: null });
    const catalog = buildCatalogCoverageReport([invented]);
    expect(catalog.inventedOfficialStats).toBe(true);
    expect(catalog.ok).toBe(false);

    const fakeAll = [
      testOccupation("2512", { scoreStatus: "fixture", scoringModel: "fixture/2026-08-29" }),
      testOccupation("2514", { scoreStatus: "fixture", scoringModel: "fixture/2026-08-29" }),
    ];
    const fakeReport = buildCatalogCoverageReport(fakeAll);
    expect(fakeReport.fullCatalogFakeScores).toBe(true);
    expect(fakeReport.errors).toContain("full_catalog_fake_scores");
  });

  it("accepts the committed catalog as partial fixture coverage, not a full fake catalogue", () => {
    const catalog = mergedCatalogFileSchema.parse(JSON.parse(readFileSync("data/occupations.json", "utf8")));
    const report = validateOccupations(catalog.occupations);
    expect(report.fullCatalogFakeScores).toBe(false);
    expect(report.ok).toBe(true);
    expect(report.fixtureScoreCount).toBe(24);
    expect(report.llmScoreCount).toBe(0);
    expect(report.visualLevel4Count).toBeGreaterThan(report.fixtureScoreCount);
  });

  it("rejects LLM score payloads that invent official employment or wages", () => {
    expect(() =>
      parseLlmScoreResponse({
        theoreticalAIExposure: 8,
        currentAIAdoption: 4,
        exposureRationale: "x",
        adoptionRationale: "y",
        humanCriticalTasks: ["a"],
        AIApplicableTasks: ["b"],
        uncertainty: "low",
        distinguishesExposureFromDisplacement: true,
        employedPersons: 12000,
      }),
    ).toThrow("invented_official_stats");
  });
});

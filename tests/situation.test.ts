import { describe, expect, it } from "vitest";
import { buildOccupationAnalysis } from "../src/lib/analysis/build";
import { NEXT_ACTION_LIMIT } from "../src/lib/scoring/weights";
import { assessSituation } from "../src/lib/situation/assess";
import { testOccupation } from "./helpers";

const software = testOccupation("2512", {
  recommendedSkills: ["dokumentointi", "koordinointi", "asiakasymmärrys"],
  laborMarketOutlook: "surplus",
  outlookStale: false,
  employmentStale: false,
});
const nearby = testOccupation("2514", {
  occupationNameFi: "Sovellusohjelmoijat",
  occupationNameEn: "Applications programmers",
  recommendedSkills: ["dokumentointi", "koordinointi", "versionhallinta"],
  laborMarketOutlook: "surplus",
  outlookStale: false,
});
const isolated = testOccupation("9112", {
  occupationNameFi: "Siivoojat",
  majorGroupCode: "9",
  AIApplicableTasks: ["raporttien luonnos"],
  humanCriticalTasks: ["tilojen puhdistus"],
  recommendedSkills: [],
  theoreticalAIExposure: 8,
  laborMarketOutlook: "balanced",
  outlookStale: false,
});

describe("recommendation-category logic", () => {
  it("explores adjacent options only when at least two independent signals exist", () => {
    const assessment = assessSituation({
      occupation: software,
      catalog: [software, nearby],
      locale: "fi",
    });
    expect(assessment.independentSignalCount).toBeGreaterThanOrEqual(2);
    expect(assessment.category).toBe("explore_adjacent_now");
    expect(assessment.derivedFromExposureAlone).toBe(false);
    expect(assessment.summary).toMatch(/Rinnakkaisia uravaihtoehtoja|altistuneilta|siirtyvät/i);
    expect(assessment.why.length).toBeGreaterThan(0);
    expect(assessment.missingEvidence.length).toBeGreaterThan(0);
  });

  it("does not derive a career change from exposure alone", () => {
    const assessment = assessSituation({
      occupation: isolated,
      catalog: [isolated, software],
      locale: "en",
    });
    expect(assessment.derivedFromExposureAlone).toBe(true);
    expect(assessment.category).not.toBe("explore_adjacent_now");
    expect(assessment.summary).not.toMatch(/unemployment probability/i);
  });

  it("returns insufficient_evidence when tasks and scores are missing", () => {
    const empty = testOccupation("7111", {
      scoreStatus: "unscored",
      theoreticalAIExposure: null,
      currentAIAdoption: null,
      AIApplicableTasks: [],
      humanCriticalTasks: [],
      recommendedSkills: [],
      laborMarketOutlook: "unavailable",
      employedPersons: null,
      employmentDataYear: null,
      uncertainty: null,
    });
    const assessment = assessSituation({ occupation: empty, catalog: [empty], locale: "sv" });
    expect(assessment.category).toBe("insufficient_evidence");
    expect(assessment.missingEvidence.join(" ")).toMatch(/saknas|Uppgift|behörighet|sysselsättning/i);
  });
});

describe("next actions", () => {
  it("returns at most three concrete actions tied to the analysis", () => {
    const analysis = buildOccupationAnalysis({
      occupation: software,
      catalog: [software, nearby],
      locale: "fi",
    });
    expect(analysis.actions.length).toBeGreaterThan(0);
    expect(analysis.actions.length).toBeLessThanOrEqual(NEXT_ACTION_LIMIT);
    expect(analysis.actions.every((action) => action.testable)).toBe(true);
    expect(analysis.actions.every((action) => action.why.length > 0)).toBe(true);
    expect(JSON.stringify(analysis.actions)).not.toMatch(/kahdessa tunnissa|two hours|två timmar/i);
  });
});

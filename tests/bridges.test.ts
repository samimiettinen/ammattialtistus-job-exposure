import { describe, expect, it } from "vitest";
import { buildCareerBridges, occupationBridgeScore } from "../src/lib/bridges";
import { careerBridgesResponseSchema } from "../src/lib/schemas/bridges";
import { testOccupation } from "./helpers";

const software = testOccupation("2512", {
  AIApplicableTasks: ["koodiluonnokset", "yksikkötestien hahmottelu"],
  humanCriticalTasks: ["tuotantovastuu"],
  recommendedSkills: ["dokumentointi", "koordinointi"],
});
const nearby = testOccupation("2514", {
  occupationNameFi: "Sovellusohjelmoijat",
  occupationNameEn: "Applications programmers",
  AIApplicableTasks: ["koodin täydennys", "yksikkötestit"],
  humanCriticalTasks: ["tuotantokoodin hyväksyntä", "asiakasneuvottelu kasvokkain"],
  recommendedSkills: ["dokumentointi", "versionhallinta"],
  theoreticalAIExposure: 9,
});
const care = testOccupation("5321", {
  occupationNameFi: "Lähihoitajat",
  occupationNameEn: "Health care assistants",
  majorGroupCode: "5",
  AIApplicableTasks: ["kirjaaminen"],
  humanCriticalTasks: ["läsnäolo"],
  theoreticalAIExposure: 3,
  laborMarketOutlook: "shortage",
});
const builder = testOccupation("7111", {
  occupationNameFi: "Talonrakentajat",
  occupationNameEn: "House builders",
  majorGroupCode: "7",
  AIApplicableTasks: [],
  humanCriticalTasks: ["asennus työmaalla"],
  theoreticalAIExposure: null,
  scoreStatus: "unscored",
  laborMarketOutlook: "unavailable",
});

describe("career bridges from structured overlap", () => {
  it("ranks a same 3-digit neighbour above an unrelated occupation", () => {
    const near = occupationBridgeScore(software, nearby);
    const far = occupationBridgeScore(software, builder);
    expect(near.overlap).toBeGreaterThan(far.overlap);
    expect(near.reasons).toContain("sameThreeDigit");
    expect(near.reasons).toContain("taskOverlap");
    expect(near.retainedSkills.length).toBeGreaterThan(0);
    expect(near.suppressed).toBe(false);
    expect(near.factors.occupationalGroupProximity).toBe(1);
    expect(near.qualificationKnown === false || Array.isArray(near.qualificationBarriers)).toBe(true);
  });

  it("does not recommend a career only because the title looks similar", () => {
    const titled = testOccupation("8322", {
      occupationNameFi: "Sovelluskuskit",
      occupationNameEn: "Software drivers",
      majorGroupCode: "8",
      AIApplicableTasks: ["reitin optimointi"],
      humanCriticalTasks: ["ajoneuvon hallinta"],
      recommendedSkills: [],
      theoreticalAIExposure: 3,
    });
    const similarTitle = occupationBridgeScore(software, titled);
    expect(similarTitle.factors.taskOverlap).toBeLessThan(0.35);
    expect(similarTitle.reasons).not.toContain("sameThreeDigit");
  });

  it("suppresses neighbours when data quality is insufficient", () => {
    const thin = testOccupation("5412", {
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
    const scored = occupationBridgeScore(software, thin);
    expect(scored.suppressed).toBe(true);
  });

  it("lists missing skills from the target and never invents a salary", () => {
    const result = buildCareerBridges(software, [software, nearby, care, builder]);
    const parsed = careerBridgesResponseSchema.parse(result);
    expect(parsed.kind).toBe("calculated");
    expect(parsed.explain).toBe("calculated");
    expect(parsed.bridges[0]?.occupationCode).toBe("2514");
    expect(parsed.bridges[0]?.missingSkills.length).toBeGreaterThan(0);
    expect(JSON.stringify(parsed)).not.toMatch(/salary|palkka|wage/i);
    expect(parsed.bridges[0]).not.toHaveProperty("salary");
  });

  it("keeps official-looking fields nullable when the neighbour is unscored", () => {
    const result = buildCareerBridges(nearby, [software, nearby, builder]);
    const row = result.bridges.find((item) => item.occupationCode === "7111");
    if (row) {
      expect(row.theoreticalAIExposure).toBeNull();
    }
    expect(result.bridges.every((item) => item.explanationKind === "calculated")).toBe(true);
  });
});

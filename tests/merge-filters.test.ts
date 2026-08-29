import { describe, expect, it } from "vitest";
import { filterOccupations } from "../src/lib/pipeline/filters";
import { mergeOccupations } from "../src/lib/pipeline/merge";
import { validateOccupations } from "../src/lib/pipeline/validate";
import { occupationSchema, type Occupation, type ParsedOccupation } from "../src/lib/schemas";

const baseOcc = (code: string, overrides: Partial<ParsedOccupation> = {}): ParsedOccupation => ({
  occupationCode: code,
  level: 4,
  parentCode: "251",
  majorGroupCode: "2",
  majorGroupName: "Erityisasiantuntijat",
  occupationNameFi: "Sovellussuunnittelijat",
  occupationNameSv: "Applikationsplanerare",
  occupationNameEn: "Software developers",
  nameFallbackSv: false,
  nameFallbackEn: false,
  description: "Suunnittelevat ohjelmistoja.",
  descriptionAvailable: true,
  sourceUrls: ["https://stat.fi/en/luokitukset/ammatti/ammatti_1_20100101"],
  ...overrides,
});

describe("merge and filters", () => {
  it("keeps scores null when unofficial scores are absent", () => {
    const merged = mergeOccupations({
      occupations: [baseOcc("2512")],
      employment: [
        {
          occupationCode: "2512",
          label: "2512",
          employedPersons: 35435,
          year: 2023,
          isResidualPxCode: false,
        },
      ],
      outlook: [],
      scores: [],
    });
    expect(merged[0]?.theoreticalAIExposure).toBeNull();
    expect(merged[0]?.laborMarketOutlook).toBe("unavailable");
    expect(merged[0]?.scoreStatus).toBe("unscored");
    expect(merged[0]?.employmentStale).toBe(true);
  });

  it("labels fixture scores and validates unique codes", () => {
    const merged = mergeOccupations({
      occupations: [baseOcc("2512"), baseOcc("7111", { occupationNameFi: "Talonrakentajat", majorGroupCode: "7", majorGroupName: "Rakentajat" })],
      employment: [],
      outlook: [],
      scores: [
        {
          occupationCode: "2512",
          theoreticalAIExposure: 9,
          currentAIAdoption: 7,
          exposureRationale: "x",
          adoptionRationale: "y",
          humanCriticalTasks: ["a"],
          AIApplicableTasks: ["b"],
          uncertainty: "low",
          scoredAt: "2026-08-29T00:00:00Z",
          scoringModel: "fixture/2026-08-29",
          promptVersion: "2026-08-29.1",
          sourceDataHash: "fixture-static",
        },
      ],
    });
    expect(merged[0]?.scoreStatus).toBe("fixture");
    const report = validateOccupations(merged);
    expect(report.ok).toBe(true);
    expect(report.uniqueCodes).toBe(true);
    expect(report.fixtureScoreCount).toBe(1);
    expect(report.unscoredCount).toBe(1);
  });

  it("filters by query, group and scored flag", () => {
    const rows = [
      occupationSchema.parse({
        ...baseOcc("2512"),
        employedPersons: 35435,
        employmentDataYear: 2023,
        laborMarketOutlook: "surplus",
        shortageSurplusIndex: -2,
        outlookSource: "test",
        theoreticalAIExposure: 9,
        currentAIAdoption: 7,
        exposureRationale: "x",
        adoptionRationale: "y",
        humanCriticalTasks: [],
        AIApplicableTasks: [],
        uncertainty: "low",
        scoredAt: "2026-08-29T00:00:00Z",
        scoringModel: "fixture/2026-08-29",
        promptVersion: "2026-08-29.1",
        employmentStale: true,
        outlookStale: false,
        scoreStatus: "fixture",
      }),
      occupationSchema.parse({
        ...baseOcc("7111", {
          occupationNameFi: "Talonrakentajat",
          occupationNameEn: "House builders",
          majorGroupCode: "7",
          majorGroupName: "Rakentajat",
        }),
        employedPersons: 100,
        employmentDataYear: 2023,
        laborMarketOutlook: "unavailable",
        shortageSurplusIndex: null,
        outlookSource: "test",
        theoreticalAIExposure: null,
        currentAIAdoption: null,
        exposureRationale: null,
        adoptionRationale: null,
        humanCriticalTasks: [],
        AIApplicableTasks: [],
        uncertainty: null,
        scoredAt: null,
        scoringModel: null,
        promptVersion: null,
        employmentStale: true,
        outlookStale: true,
        scoreStatus: "unscored",
      }),
    ] satisfies Occupation[];

    expect(filterOccupations(rows, { q: "software" })).toHaveLength(1);
    expect(filterOccupations(rows, { group: "7" })).toHaveLength(1);
    expect(filterOccupations(rows, { scoreStatus: "scored" })).toHaveLength(1);
    expect(filterOccupations(rows, { minEmployment: 1000 })).toHaveLength(1);
  });

  it("rejects scores outside 0–10", () => {
    expect(() =>
      occupationSchema.parse({
        ...baseOcc("2512"),
        employedPersons: 1,
        employmentDataYear: 2023,
        laborMarketOutlook: "unavailable",
        shortageSurplusIndex: null,
        outlookSource: "t",
        theoreticalAIExposure: 11,
        currentAIAdoption: 0,
        exposureRationale: "x",
        adoptionRationale: "y",
        humanCriticalTasks: [],
        AIApplicableTasks: [],
        uncertainty: "low",
        scoredAt: "2026-08-29T00:00:00Z",
        scoringModel: "fixture/2026-08-29",
        promptVersion: "2026-08-29.1",
        employmentStale: true,
        outlookStale: true,
        scoreStatus: "fixture",
      }),
    ).toThrow();
  });
});

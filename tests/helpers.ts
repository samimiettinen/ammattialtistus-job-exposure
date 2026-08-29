import { occupationSchema, type Occupation, type ParsedOccupation } from "../src/lib/schemas";

export const baseParsed = (code: string, overrides: Partial<ParsedOccupation> = {}): ParsedOccupation => ({
  occupationCode: code,
  level: 4,
  parentCode: code.length > 1 ? code.slice(0, -1) : null,
  majorGroupCode: code.charAt(0),
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

export function testOccupation(code: string, overrides: Partial<Occupation> = {}): Occupation {
  return occupationSchema.parse({
    ...baseParsed(code),
    employedPersons: 1000,
    employmentDataYear: 2023,
    laborMarketOutlook: "balanced",
    shortageSurplusIndex: 0,
    outlookSource: "test",
    theoreticalAIExposure: 8,
    currentAIAdoption: 5,
    exposureRationale: "Ensimmäinen syy. Toinen syy. Kolmas syy.",
    adoptionRationale: "Käyttö on rajattua.",
    humanCriticalTasks: ["vastuu"],
    AIApplicableTasks: ["luonnos"],
    recommendedSkills: [],
    uncertainty: "medium",
    scoredAt: "2026-08-29T00:00:00Z",
    scoringModel: "fixture/2026-08-29",
    promptVersion: "2026-08-29.1",
    employmentStale: true,
    outlookStale: false,
    scoreStatus: "fixture",
    ...overrides,
  });
}

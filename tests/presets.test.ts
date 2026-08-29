import { describe, expect, it } from "vitest";
import { filterOccupations } from "../src/lib/pipeline/filters";
import { occupationQuerySchema } from "../src/lib/schemas";
import { applyPreset, largestGroupCodes, matchesUnusedPotential } from "../src/lib/presets";
import { testOccupation } from "./helpers";

const universe = [
  testOccupation("5321", {
    occupationNameFi: "Lähihoitajat",
    majorGroupCode: "5",
    employedPersons: 94000,
    theoreticalAIExposure: 3.4,
    currentAIAdoption: 2.2,
    laborMarketOutlook: "surplus",
  }),
  testOccupation("5223", {
    occupationNameFi: "Myyjät",
    majorGroupCode: "5",
    employedPersons: 100000,
    theoreticalAIExposure: 3.8,
    currentAIAdoption: 3.4,
    laborMarketOutlook: "surplus",
  }),
  testOccupation("2512", {
    employedPersons: 35000,
    theoreticalAIExposure: 9.2,
    currentAIAdoption: 7.4,
    laborMarketOutlook: "surplus",
  }),
  testOccupation("4110", {
    occupationNameFi: "Toimistoavustajat",
    occupationNameSv: "Kontorsassistenter",
    occupationNameEn: "General office clerks",
    majorGroupCode: "4",
    employedPersons: 4000,
    theoreticalAIExposure: 8.6,
    currentAIAdoption: 5.1,
    laborMarketOutlook: "balanced",
  }),
  testOccupation("2211", {
    occupationNameFi: "Yleislääkärit",
    occupationNameSv: "Allmänläkare",
    occupationNameEn: "Generalist medical practitioners",
    majorGroupCode: "2",
    employedPersons: 8000,
    theoreticalAIExposure: 5.2,
    currentAIAdoption: 3.6,
    laborMarketOutlook: "shortage",
  }),
];

describe("preset filters", () => {
  it("parses preset query values and rejects unknown ids", () => {
    expect(occupationQuerySchema.parse({ preset: "high_exposure" }).preset).toBe("high_exposure");
    expect(() => occupationQuerySchema.parse({ preset: "unemployment" })).toThrow();
  });

  it("keeps occupations in the largest 2-digit groups", () => {
    expect(largestGroupCodes(universe, 1)).toEqual(["52"]);
    expect(largestGroupCodes(universe, 2)).toEqual(["52", "53"]);
    const crowded = [
      ...universe,
      ...["31", "32", "33", "34", "61", "71", "81", "91"].map((group, index) =>
        testOccupation(`${group}00`, {
          occupationNameFi: `Pieni ${group}`,
          occupationNameEn: `Small ${group}`,
          majorGroupCode: group.charAt(0),
          employedPersons: 10 + index,
          theoreticalAIExposure: 1,
          currentAIAdoption: 1,
        }),
      ),
    ];
    const filtered = applyPreset(crowded, "largest", crowded);
    expect(filtered.some((row) => row.occupationCode === "3100")).toBe(false);
    expect(filtered.map((row) => row.occupationCode)).toContain("5223");
    expect(filtered.map((row) => row.occupationCode)).toContain("5321");
  });

  it("selects high theoretical exposure without treating it as unemployment", () => {
    const filtered = applyPreset(universe, "high_exposure");
    expect(filtered.map((row) => row.occupationCode).sort()).toEqual(["2512", "4110"]);
    expect(filtered.every((row) => (row.theoreticalAIExposure ?? 0) >= 7)).toBe(true);
  });

  it("selects unused AI potential as a score gap, not a job-loss probability", () => {
    expect(matchesUnusedPotential(universe.find((row) => row.occupationCode === "4110")!)).toBe(true);
    expect(matchesUnusedPotential(universe.find((row) => row.occupationCode === "2512")!)).toBe(false);
    expect(applyPreset(universe, "unused_potential").map((row) => row.occupationCode)).toEqual(["4110"]);
  });

  it("selects labour shortage from official outlook only", () => {
    expect(applyPreset(universe, "shortage").map((row) => row.occupationCode)).toEqual(["2211"]);
  });

  it("combines preset with search through filterOccupations", () => {
    const rows = filterOccupations(universe, { preset: "high_exposure", q: "software" });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.occupationCode).toBe("2512");
  });
});

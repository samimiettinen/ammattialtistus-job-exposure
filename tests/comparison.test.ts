import { describe, expect, it } from "vitest";
import {
  buildComparisonView,
  comparisonExportRows,
  parseCompareParam,
  serializeCompareParam,
  toggleCompareCode,
} from "../src/lib/comparison";
import { COMPARE_MAX, compareQuerySchema } from "../src/lib/schemas/comparison";
import { testOccupation } from "./helpers";

describe("comparison URL state", () => {
  it("parses, de-duplicates and caps compare codes from the URL", () => {
    expect(parseCompareParam("2512,5321,7111,2411,2211")).toEqual(["2512", "5321", "7111", "2411"]);
    expect(parseCompareParam("2512, 2512, 5321")).toEqual(["2512", "5321"]);
    expect(parseCompareParam("XXXX,2512")).toEqual(["2512"]);
    expect(parseCompareParam("")).toEqual([]);
    expect(serializeCompareParam(["2512", "5321"])).toBe("2512,5321");
    expect(serializeCompareParam([])).toBeNull();
  });

  it("toggles codes and refuses a fifth occupation", () => {
    let codes = toggleCompareCode([], "2512");
    codes = toggleCompareCode(codes, "5321");
    expect(codes).toEqual(["2512", "5321"]);
    codes = toggleCompareCode(codes, "2512");
    expect(codes).toEqual(["5321"]);
    codes = ["1111", "2222", "3333", "4444"];
    expect(toggleCompareCode(codes, "5555")).toEqual(codes);
    expect(codes).toHaveLength(COMPARE_MAX);
  });

  it("accepts the compare API query shape", () => {
    expect(compareQuerySchema.parse({ codes: "2512,5321" }).codes).toBe("2512,5321");
    expect(compareQuerySchema.safeParse({}).success).toBe(false);
  });
});

describe("comparison missing-data rendering", () => {
  const catalog = [
    testOccupation("2512"),
    testOccupation("9998", {
      employedPersons: null,
      employmentDataYear: null,
      laborMarketOutlook: "unavailable",
      shortageSurplusIndex: null,
      theoreticalAIExposure: null,
      currentAIAdoption: null,
      exposureRationale: null,
      AIApplicableTasks: [],
      humanCriticalTasks: [],
      recommendedSkills: [],
      uncertainty: null,
      scoredAt: null,
      scoringModel: null,
      promptVersion: null,
      scoreStatus: "unscored",
      sourceUrls: [],
    }),
  ];

  it("renders unavailable labels and never invents official counts", () => {
    const view = buildComparisonView({
      catalog,
      codes: ["2512", "9998", "0000"],
      locale: "fi",
      nameOf: (occupation) => occupation.occupationNameFi,
      unavailable: "Tietoa ei saatavilla",
      outlookLabel: () => "Tasapaino",
      uncertaintyLabel: () => "Keskitaso",
    });
    expect(view.missing).toEqual(["0000"]);
    expect(view.columns).toHaveLength(3);
    const scored = view.columns[0]!;
    const unscored = view.columns[1]!;
    const unknown = view.columns[2]!;
    expect(scored.official.employed).toBe("1\u00a0000");
    expect(scored.ai.exposure).toBe("8");
    expect(unscored.official.employed).toBe("Tietoa ei saatavilla");
    expect(unscored.official.outlook).toBe("Tietoa ei saatavilla");
    expect(unscored.ai.exposure).toBe("Tietoa ei saatavilla");
    expect(unscored.ai.aiTasks).toEqual(["Tietoa ei saatavilla"]);
    expect(unscored.ai.skills).toEqual(["Tietoa ei saatavilla"]);
    expect(unknown.present).toBe(false);
    expect(unknown.official.employed).toBe("Tietoa ei saatavilla");
    expect(unknown.ai.adoption).toBe("Tietoa ei saatavilla");
    expect(String(unscored.official.employed)).not.toMatch(/\d{2,}/);
  });

  it("exports official and AI rows without a salary field", () => {
    const view = buildComparisonView({
      catalog,
      codes: ["2512", "9998"],
      locale: "en",
      nameOf: (occupation) => occupation.occupationNameEn,
      unavailable: "Information not available",
      outlookLabel: () => "Balanced",
      uncertaintyLabel: () => "Medium",
    });
    const rows = comparisonExportRows(view.columns, {
      employed: "Employed persons",
      year: "Year",
      outlook: "Outlook",
      exposure: "Exposure",
      adoption: "Adoption",
      uncertainty: "Uncertainty",
      reasons: "Reasons",
      ai: "AI tasks",
      human: "Human tasks",
      skills: "Skills",
      sources: "Sources",
    });
    expect(rows.map((row) => row.key)).not.toContain("salary");
    expect(rows.find((row) => row.key === "employed")?.values[1]).toBe("Information not available");
    expect(rows.find((row) => row.key === "sources")?.values[0]).toContain("stat.fi");
  });
});

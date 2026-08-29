import { describe, expect, it } from "vitest";
import {
  buildOccupationDetailModel,
  dataAvailabilityStatus,
  displayValue,
  exposureReasonsFromRationale,
  firstSentence,
  isUnclassifiedOccupation,
  residualEmploymentNotice,
} from "../src/lib/occupation-view";
import { occupationSchema } from "../src/lib/schemas";
import { testOccupation } from "./helpers";

describe("occupation schema extensions", () => {
  it("defaults recommendedSkills and accepts missing parentCode", () => {
    const parsed = occupationSchema.parse({
      ...testOccupation("2512"),
      parentCode: undefined,
      recommendedSkills: undefined,
    });
    expect(parsed.recommendedSkills).toEqual([]);
    expect(parsed.parentCode).toBeUndefined();
  });

  it("keeps explicit recommendedSkills and parentCode", () => {
    const parsed = occupationSchema.parse(
      testOccupation("2512", { parentCode: "251", recommendedSkills: ["versionhallinta"] }),
    );
    expect(parsed.parentCode).toBe("251");
    expect(parsed.recommendedSkills).toEqual(["versionhallinta"]);
  });
});

describe("missing-data rendering", () => {
  it("uses the unavailable label for null official and AI fields", () => {
    const occupation = testOccupation("9999", {
      employedPersons: null,
      employmentDataYear: null,
      laborMarketOutlook: "unavailable",
      shortageSurplusIndex: null,
      theoreticalAIExposure: null,
      currentAIAdoption: null,
      exposureRationale: null,
      adoptionRationale: null,
      humanCriticalTasks: [],
      AIApplicableTasks: [],
      recommendedSkills: [],
      uncertainty: null,
      scoredAt: null,
      scoringModel: null,
      promptVersion: null,
      scoreStatus: "unscored",
      description: "",
      descriptionAvailable: false,
    });
    const model = buildOccupationDetailModel(occupation, {
      locale: "fi",
      unavailable: "Tietoa ei saatavilla",
      outlookLabel: "unused",
      uncertaintyLabel: null,
    });
    expect(model.official.employed).toBe("Tietoa ei saatavilla");
    expect(model.official.year).toBe("Tietoa ei saatavilla");
    expect(model.official.outlook).toBe("Tietoa ei saatavilla");
    expect(model.official.index).toBe("Tietoa ei saatavilla");
    expect(model.official.description).toBe("Tietoa ei saatavilla");
    expect(model.ai.exposure).toBe("Tietoa ei saatavilla");
    expect(model.ai.adoption).toBe("Tietoa ei saatavilla");
    expect(model.ai.uncertainty).toBe("Tietoa ei saatavilla");
    expect(model.ai.reasons).toEqual(["Tietoa ei saatavilla"]);
    expect(model.ai.aiTasks).toEqual(["Tietoa ei saatavilla"]);
    expect(model.ai.humanTasks).toEqual(["Tietoa ei saatavilla"]);
    expect(model.ai.skills).toEqual(["Tietoa ei saatavilla"]);
    expect(model.ai.scoredAt).toBe("Tietoa ei saatavilla");
    expect(model.ai.scoringModel).toBe("Tietoa ei saatavilla");
    expect(model.ai.promptVersion).toBe("Tietoa ei saatavilla");
  });

  it("does not invent a numeric score range from uncertainty", () => {
    const model = buildOccupationDetailModel(testOccupation("2512", { uncertainty: "high" }), {
      locale: "fi",
      unavailable: "Tietoa ei saatavilla",
      outlookLabel: "Tasapaino",
      uncertaintyLabel: "Korkea",
    });
    expect(model.ai.uncertainty).toBe("Korkea");
    expect(model.ai.uncertainty).not.toMatch(/±|\d+\s*[–-]\s*\d+/);
  });

  it("displayValue never substitutes a guessed number", () => {
    expect(displayValue(null, "Tietoa ei saatavilla")).toBe("Tietoa ei saatavilla");
    expect(displayValue(undefined, "Information not available")).toBe("Information not available");
  });
});

describe("exposure reasons and provenance", () => {
  it("splits exposureRationale into at most three sentences", () => {
    expect(
      exposureReasonsFromRationale("Ensimmäinen. Toinen! Kolmas? Neljäs."),
    ).toEqual(["Ensimmäinen.", "Toinen!", "Kolmas?"]);
    expect(exposureReasonsFromRationale(null)).toEqual([]);
    expect(firstSentence("Yksi lause ilman pistettä")).toBe("Yksi lause ilman pistettä");
  });

  it("surfaces scoring date, model, prompt version and source urls", () => {
    const occupation = testOccupation("2512", {
      scoredAt: "2026-08-29T00:00:00Z",
      scoringModel: "fixture/2026-08-29",
      promptVersion: "2026-08-29.1",
      sourceUrls: ["https://stat.fi/en/luokitukset/ammatti/ammatti_1_20100101"],
    });
    const model = buildOccupationDetailModel(occupation, {
      locale: "fi",
      unavailable: "Tietoa ei saatavilla",
      outlookLabel: "Tasapaino",
      uncertaintyLabel: "Keskitaso",
    });
    expect(model.ai.scoredAt).toBe("2026-08-29T00:00:00Z");
    expect(model.ai.scoringModel).toBe("fixture/2026-08-29");
    expect(model.ai.promptVersion).toBe("2026-08-29.1");
    expect(model.sources).toContain("https://stat.fi/en/luokitukset/ammatti/ammatti_1_20100101");
    expect(model.ai.status).toBe("fixture");
  });
});

describe("unclassified residual employment", () => {
  it("flags X-codes and keeps XXXX out of the visual occupation set", () => {
    expect(isUnclassifiedOccupation({ occupationCode: "XXXX", majorGroupCode: "X" })).toBe(true);
    expect(isUnclassifiedOccupation({ occupationCode: "2512", majorGroupCode: "2" })).toBe(false);
    const notice = residualEmploymentNotice([
      testOccupation("XXXX", {
        occupationCode: "XXXX",
        majorGroupCode: "X",
        majorGroupName: "Tuntematon",
        occupationNameFi: "Tuntematon",
        employedPersons: 102555,
        scoreStatus: "unscored",
        theoreticalAIExposure: null,
      }),
    ]);
    expect(notice).toEqual({
      code: "XXXX",
      employedPersons: 102555,
      employmentDataYear: 2023,
    });
  });

  it("marks unscored rows as unscored for tooltip availability", () => {
    expect(dataAvailabilityStatus(testOccupation("7111", { scoreStatus: "unscored", theoreticalAIExposure: null }))).toBe(
      "unscored",
    );
  });
});

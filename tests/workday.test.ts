import { describe, expect, it, vi } from "vitest";
import { analyzeWorkday, analyzeWorkdaySync } from "../src/lib/workday/analyze";
import { fixtureWorkdayAnalysis } from "../src/lib/workday/fixture";
import { matchOccupations, scoreOccupationMatch } from "../src/lib/workday/match";
import { parseWorkdayModelOutput } from "../src/lib/workday/parse";
import { WORKDAY_PRIVACY, responseContainsWorkdayText } from "../src/lib/workday/privacy";
import { consumeWorkdayRateLimit, resetWorkdayRateLimit } from "../src/lib/workday/rate-limit";
import { workdayRequestSchema } from "../src/lib/schemas/workday";
import { testOccupation } from "./helpers";

const catalog = [
  testOccupation("2512"),
  testOccupation("5321", {
    occupationNameFi: "Lähihoitajat",
    occupationNameSv: "Närvårdare",
    occupationNameEn: "Health care assistants",
    majorGroupCode: "5",
    majorGroupName: "Palvelu",
    description: "Hoitavat potilaita ja avustavat arjessa.",
    AIApplicableTasks: ["kirjaaminen"],
    humanCriticalTasks: ["läsnäolo"],
    theoreticalAIExposure: 3,
  }),
  testOccupation("7111", {
    occupationNameFi: "Talonrakentajat",
    occupationNameSv: "Husbyggare",
    occupationNameEn: "House builders",
    majorGroupCode: "7",
    description: "Rakentavat taloja työmaalla.",
    AIApplicableTasks: [],
    humanCriticalTasks: ["asennus"],
    theoreticalAIExposure: 2,
    scoreStatus: "unscored",
  }),
];

const validModel = {
  tasks: Array.from({ length: 8 }, (_, index) => ({
    text: `Tehtävä ${index + 1}`,
    classification: index < 3 ? "accelerate" : index < 5 ? "assist" : "human",
  })),
  accelerateShareLow: 0.2,
  accelerateShareHigh: 0.4,
  automatableShareLow: 0.1,
  automatableShareHigh: 0.25,
  recommendedSkills: ["versionhallinta", "testaus", "asiakasviestintä"],
  distinguishesExposureFromDisplacement: true,
};

describe("occupation matching and ambiguity", () => {
  it("selects an exact title or code and asks the user when two titles are close", () => {
    const exact = matchOccupations(catalog, { jobTitle: "2512", workdayText: "Kirjoitan koodia ja testejä päivittäin." });
    expect(exact.status).toBe("selected");
    expect(exact.selected?.occupationCode).toBe("2512");

    const named = matchOccupations(catalog, {
      jobTitle: "Sovellussuunnittelijat",
      workdayText: "Suunnittelen ohjelmistoja ja kirjoitan dokumentaatiota.",
    });
    expect(named.status).toBe("selected");
    expect(named.selected?.occupationCode).toBe("2512");

    const care = matchOccupations(catalog, {
      jobTitle: "lähihoitaja",
      workdayText: "Hoidan potilaita osastolla ja kirjaan tietoja.",
    });
    expect(care.matches[0]?.occupationCode).toBe("5321");

    const twins = [
      testOccupation("2512"),
      testOccupation("2514", {
        occupationNameFi: "Sovellusohjelmoijat",
        occupationNameEn: "Applications programmers",
        description: "Suunnittelevat ohjelmistoja.",
      }),
    ];
    const ambiguous = matchOccupations(twins, {
      jobTitle: "sovellus",
      workdayText: "Koodaan ja testaan ohjelmistoja tietokoneella.",
    });
    expect(ambiguous.status).toBe("ambiguous");
    expect(ambiguous.matches.length).toBeGreaterThanOrEqual(2);
    expect(ambiguous.selected).toBeNull();
  });

  it("returns no_match for unrelated prose", () => {
    expect(
      matchOccupations(catalog, {
        jobTitle: "xyzzy-foobar",
        workdayText: "Kissa nukkuu sohvalla eikä tämä liity mihinkään ammattiin lainkaan.",
      }).status,
    ).toBe("no_match");
  });

  it("scores an explicit occupationCode as selected", () => {
    const result = matchOccupations(catalog, {
      occupationCode: "7111",
      workdayText: "Kannan tiiliä ja teen muurausta työmaalla joka päivä.",
    });
    expect(result.status).toBe("selected");
    expect(result.matches[0]?.confidence).toBe(1);
  });
});

describe("malformed AI output and ranges", () => {
  it("rejects empty tasks, inverted ranges and forbidden wage keys", () => {
    expect(() => parseWorkdayModelOutput({ tasks: [] })).toThrow("malformed_model_output");
    expect(() =>
      parseWorkdayModelOutput({
        ...validModel,
        accelerateShareLow: 0.8,
        accelerateShareHigh: 0.2,
      }),
    ).toThrow("malformed_model_output");
    expect(() => parseWorkdayModelOutput({ ...validModel, salary: 4000 })).toThrow("malformed_model_output");
    expect(() =>
      parseWorkdayModelOutput({ ...validModel, distinguishesExposureFromDisplacement: false }),
    ).toThrow("malformed_model_output");
    const ok = parseWorkdayModelOutput(validModel);
    expect(ok.tasks).toHaveLength(8);
    expect(ok.accelerateShareLow).toBeLessThanOrEqual(ok.accelerateShareHigh);
  });

  it("returns 502 when the injected model output is malformed", async () => {
    const persist = vi.fn();
    const result = await analyzeWorkday({
      request: {
        locale: "fi",
        jobTitle: "Sovellussuunnittelijat",
        workdayText: "Kirjoitan rajapintoja, testejä ja dokumentaatiota koko päivän.",
      },
      catalog,
      persist,
      complete: async () => ({ tasks: [{ text: "x", classification: "accelerate" }] }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("malformed_model_output");
    expect(persist).not.toHaveBeenCalled();
  });
});

describe("privacy constraints", () => {
  it("does not persist or echo free-text fields", async () => {
    expect(WORKDAY_PRIVACY.persistFreeText).toBe(false);
    expect(WORKDAY_PRIVACY.logRequestBody).toBe(false);
    expect(WORKDAY_PRIVACY.analyticsIncludeText).toBe(false);
    const persist = vi.fn();
    const workdayText = "Kirjoitan rajapintoja, testejä ja dokumentaatiota koko päivän ilman palkka-arviota.";
    const result = await analyzeWorkday({
      request: { locale: "fi", jobTitle: "Sovellussuunnittelijat", workdayText },
      catalog,
      persist,
      complete: async () => validModel,
    });
    expect(result.ok).toBe(true);
    expect(persist).not.toHaveBeenCalled();
    if (result.ok) {
      expect(result.response).not.toHaveProperty("workdayText");
      expect(responseContainsWorkdayText(result.response, workdayText)).toBe(false);
      expect(result.response.kind).toBe("ai_estimate");
      expect(result.response.citations.every((item) => item.url.startsWith("https://"))).toBe(true);
    }
  });

  it("rejects short or huge request bodies", () => {
    expect(workdayRequestSchema.safeParse({ workdayText: "liian lyhyt" }).success).toBe(false);
    expect(workdayRequestSchema.safeParse({ workdayText: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("fixture and rate limit", () => {
  it("builds a labelled fixture from occupation fields only", () => {
    const output = fixtureWorkdayAnalysis(catalog[0]!);
    expect(output.tasks.length).toBeGreaterThanOrEqual(8);
    expect(output.recommendedSkills.length).toBeGreaterThanOrEqual(3);
    const response = analyzeWorkdaySync({
      request: {
        locale: "fi",
        occupationCode: "2512",
        workdayText: "Kirjoitan rajapintoja, testejä ja dokumentaatiota koko päivän.",
      },
      catalog,
      fixture: true,
    });
    expect(response.fixture).toBe(true);
    expect(response.status).toBe("ok");
  });

  it("rate-limits a client key", () => {
    resetWorkdayRateLimit();
    for (let i = 0; i < 10; i += 1) {
      expect(consumeWorkdayRateLimit("test-ip", 1_000 + i).ok).toBe(true);
    }
    const blocked = consumeWorkdayRateLimit("test-ip", 1_020);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("match scoring sanity", () => {
  it("ranks the software occupation above construction for coding prose", () => {
    const query = { jobTitle: "sovellussuunnittelija", workdayText: "Kirjoitan koodia, testejä ja dokumentaatiota." };
    expect(scoreOccupationMatch(catalog[0]!, query)).toBeGreaterThan(scoreOccupationMatch(catalog[2]!, query));
  });
});

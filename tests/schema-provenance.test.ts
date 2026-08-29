import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { enrichOccupationAnalysis, evidenceFromSourceUrls, occupationCacheKey } from "../src/lib/occupation-analysis";
import { mergeOccupations } from "../src/lib/pipeline/merge";
import {
  occupationSchema,
  scoreRecordSchema,
  llmScoreResponseSchema,
  mergedCatalogFileSchema,
} from "../src/lib/schemas";
import { baseParsed, testOccupation } from "./helpers";

describe("occupation and score schemas", () => {
  it("defaults new analysis fields and keeps official numbers nullable", () => {
    const parsed = occupationSchema.parse({
      ...testOccupation("2512"),
      exposureRangeLow: undefined,
      exposureRangeHigh: undefined,
      exposureReasons: undefined,
      evidence: undefined,
      recommendedSkills: undefined,
    });
    expect(parsed.exposureRangeLow).toBeNull();
    expect(parsed.exposureRangeHigh).toBeNull();
    expect(parsed.exposureReasons).toEqual([]);
    expect(parsed.recommendedSkills).toEqual([]);
    expect(parsed.evidence).toEqual([]);
    expect(parsed.scoredAt).toBe("2026-08-29T00:00:00Z");
    expect(parsed.scoringModel).toBe("fixture/2026-08-29");
    expect(parsed.promptVersion).toBe("2026-08-29.1");
    expect(parsed.sourceUrls[0]).toMatch(/^https:\/\//);
  });

  it("rejects inverted exposure ranges and scores outside 0–10", () => {
    expect(() =>
      occupationSchema.parse(testOccupation("2512", { exposureRangeLow: 8, exposureRangeHigh: 3 })),
    ).toThrow();
    expect(() => occupationSchema.parse(testOccupation("2512", { theoreticalAIExposure: 11 }))).toThrow();
  });

  it("parses committed fixture scores without inventing catalog coverage", () => {
    const fixtures = scoreRecordSchema.array().parse(
      JSON.parse(readFileSync("data/fixtures/scores.json", "utf8")),
    );
    expect(fixtures.length).toBeGreaterThan(0);
    expect(fixtures.every((row) => row.scoringModel?.startsWith("fixture/"))).toBe(true);
    expect(fixtures.every((row) => row.promptVersion === "2026-08-29.1")).toBe(true);
    expect(fixtures.every((row) => (row.recommendedSkills ?? []).length === 0)).toBe(true);
    expect(fixtures.every((row) => row.exposureRangeLow == null && row.exposureRangeHigh == null)).toBe(true);
  });

  it("keeps the offline LLM contract strict about displacement", () => {
    expect(() =>
      llmScoreResponseSchema.parse({
        theoreticalAIExposure: 8,
        currentAIAdoption: 4,
        exposureRationale: "x",
        adoptionRationale: "y",
        humanCriticalTasks: ["a"],
        AIApplicableTasks: ["b"],
        uncertainty: "low",
        distinguishesExposureFromDisplacement: false,
      }),
    ).toThrow();
  });
});

describe("source and provenance derivation", () => {
  it("builds evidence from existing source URLs and cache keys from identity fields", () => {
    const evidence = evidenceFromSourceUrls([
      "https://pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tyokay/115r.px",
      "https://stat.fi/en/luokitukset/ammatti/ammatti_1_20100101",
    ]);
    expect(evidence[0]?.kind).toBe("official");
    expect(evidence[1]?.kind).toBe("classification");
    expect(
      occupationCacheKey({
        occupationCode: "2512",
        promptVersion: "2026-08-29.1",
        sourceDataHash: "abc",
        scoringModel: "fixture/2026-08-29",
      }),
    ).toBe("2512::abc::2026-08-29.1::fixture/2026-08-29");
  });

  it("enriches reasons from rationale and does not invent an exposure range", () => {
    const enriched = enrichOccupationAnalysis(
      testOccupation("2512", { exposureReasons: [], exposureRangeLow: null, exposureRangeHigh: null }),
    );
    expect(enriched.exposureReasons).toEqual(["Ensimmäinen syy.", "Toinen syy.", "Kolmas syy."]);
    expect(enriched.exposureRangeLow).toBeNull();
    expect(enriched.exposureRangeHigh).toBeNull();
    expect(enriched.evidence.some((item) => item.url.includes("stat.fi"))).toBe(true);
  });

  it("leaves unscored merge rows unscored and still attaches official evidence", () => {
    const [merged] = mergeOccupations({
      occupations: [baseParsed("7111")],
      employment: [],
      outlook: [],
      scores: [],
    });
    expect(merged?.scoreStatus).toBe("unscored");
    expect(merged?.theoreticalAIExposure).toBeNull();
    expect(merged?.exposureRangeLow).toBeNull();
    expect(merged?.recommendedSkills).toEqual([]);
    expect(merged?.evidence[0]?.url).toMatch(/^https:\/\//);
    expect(merged?.sourceUrls).toEqual(merged?.evidence.map((item) => item.url));
  });

  it("parses the committed catalog provenance block", () => {
    const catalog = mergedCatalogFileSchema.parse(
      JSON.parse(readFileSync("data/occupations.json", "utf8")),
    );
    expect(catalog.provenance.classification.localId).toBe("ammatti_1_20100101");
    expect(catalog.provenance.employment.tableId).toBe("115r");
    expect(catalog.retrievedAt).toBe("2026-08-29");
    const scored = catalog.occupations.filter((row) => row.scoreStatus !== "unscored");
    const totalLevel4 = catalog.occupations.filter((row) => row.level === 4);
    expect(scored.length).toBeLessThan(totalLevel4.length);
    expect(scored.every((row) => row.scoringModel && row.promptVersion && row.scoredAt)).toBe(true);
  });
});

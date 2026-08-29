import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildOccupationAnalysis } from "../src/lib/analysis/build";
import { occupationBridgeScore } from "../src/lib/bridges";
import { WORKDAY_PRIVACY } from "../src/lib/workday/privacy";
import { BRIDGE_TIE_EPSILON, BRIDGE_WEIGHTS } from "../src/lib/scoring/weights";
import { testOccupation } from "./helpers";

const fi = JSON.parse(readFileSync("src/messages/fi.json", "utf8")) as Record<string, unknown>;
const sv = JSON.parse(readFileSync("src/messages/sv.json", "utf8")) as Record<string, unknown>;
const en = JSON.parse(readFileSync("src/messages/en.json", "utf8")) as Record<string, unknown>;

function keyTree(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyTree(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("source provenance and stale analyses", () => {
  it("labels official, AI, calculated and unavailable fields without inventing wages", () => {
    const occupation = testOccupation("2512", { employmentStale: true, outlookStale: true });
    const analysis = buildOccupationAnalysis({
      occupation,
      catalog: [occupation, testOccupation("2514")],
      locale: "fi",
    });
    expect(analysis.coverage.fields.officialEmployment.kind).toBe("official");
    expect(analysis.coverage.fields.aiScores.kind).toBe("ai_estimate");
    expect(analysis.analysisStale).toBe(true);
    expect(analysis.situation.why.join(" ")).toMatch(/ei ole työttömyyden todennäköisyys/i);
    expect(JSON.stringify(analysis)).not.toMatch(/salary|palkka|wage/i);
  });
});

describe("localisation consistency", () => {
  it("keeps the same message key tree in FI, SV and EN", () => {
    expect(keyTree(sv).sort()).toEqual(keyTree(fi).sort());
    expect(keyTree(en).sort()).toEqual(keyTree(fi).sort());
    expect(fi.notice).toBe("AI-altistus ei tarkoita työpaikkojen katoamista");
    expect(sv.notice).toBe("AI-altistus ei tarkoita työpaikkojen katoamista");
    expect(en.notice).toBe("AI-altistus ei tarkoita työpaikkojen katoamista");
    expect((fi.common as { unavailable: string }).unavailable).toBe("Tietoa ei saatavilla");
    expect((sv.common as { unavailable: string }).unavailable).toBe("Uppgift saknas");
    expect((en.common as { unavailable: string }).unavailable).toBe("Information not available");
  });

  it("builds situation copy in all three languages", () => {
    const occupation = testOccupation("2512", { laborMarketOutlook: "surplus" });
    const catalog = [occupation, testOccupation("2514")];
    for (const locale of ["fi", "sv", "en"] as const) {
      const analysis = buildOccupationAnalysis({ occupation, catalog, locale });
      expect(analysis.situation.locale).toBe(locale);
      expect(analysis.situation.summary.length).toBeGreaterThan(20);
      expect(analysis.actions[0]?.title.length).toBeGreaterThan(5);
    }
  });
});

describe("privacy constraints remain hard rules", () => {
  it("does not store or analyse workday free text", () => {
    expect(WORKDAY_PRIVACY.persistFreeText).toBe(false);
    expect(WORKDAY_PRIVACY.logRequestBody).toBe(false);
    expect(WORKDAY_PRIVACY.analyticsIncludeText).toBe(false);
    expect(WORKDAY_PRIVACY.echoWorkdayText).toBe(false);
  });
});

describe("bridge weight source and sensitivity", () => {
  it("keeps documented weights in one file that sum to one", () => {
    const sum = Object.values(BRIDGE_WEIGHTS).reduce((total, value) => total + value, 0);
    expect(sum).toBeCloseTo(1, 8);
  });

  it("does not reverse a clear ranking after a tiny exposure change", () => {
    const source = testOccupation("2512");
    const near = testOccupation("2514", {
      occupationNameFi: "Sovellusohjelmoijat",
      AIApplicableTasks: ["koodin täydennys", "yksikkötestit"],
    });
    const far = testOccupation("7111", {
      majorGroupCode: "7",
      occupationNameFi: "Talonrakentajat",
      AIApplicableTasks: ["asennus"],
      humanCriticalTasks: ["työmaan turvallisuus"],
      theoreticalAIExposure: 2,
    });
    const baselineNear = occupationBridgeScore(source, near).overlap;
    const baselineFar = occupationBridgeScore(source, far).overlap;
    expect(baselineNear - baselineFar).toBeGreaterThan(BRIDGE_TIE_EPSILON);
    const tweaked = occupationBridgeScore(testOccupation("2512", { theoreticalAIExposure: 8.1 }), near).overlap;
    expect(tweaked).toBeGreaterThan(baselineFar);
    expect(Math.abs(tweaked - baselineNear)).toBeLessThan(0.05);
  });
});

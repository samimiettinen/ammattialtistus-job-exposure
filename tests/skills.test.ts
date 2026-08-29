import { describe, expect, it } from "vitest";
import {
  isGenericSkillText,
  normalizeSkillLabel,
  normalizeSkillLabels,
  skillLabel,
  skillsFromOccupation,
  taxonomyLocalisationConsistent,
} from "../src/lib/skills/normalize";
import { deterministicOverlapScore, transferableOverlap } from "../src/lib/skills/overlap";
import { foldSkillText } from "../src/lib/skills/taxonomy";
import { testOccupation } from "./helpers";

describe("skill synonym normalisation", () => {
  it("collapses FI/SV/EN synonyms to one canonical id and keeps translations", () => {
    const fi = normalizeSkillLabel("dokumentointi", "explicit_skill");
    const sv = normalizeSkillLabel("dokumentation", "explicit_skill");
    const en = normalizeSkillLabel("documentation", "explicit_skill");
    expect(fi?.id).toBe("documentation");
    expect(sv?.id).toBe("documentation");
    expect(en?.id).toBe("documentation");
    expect(fi?.labels.sv).toBe("dokumentation");
    expect(skillLabel(fi!, "en")).toBe("documentation");
    expect(taxonomyLocalisationConsistent()).toBe(true);
  });

  it("deduplicates the same skill expressed twice", () => {
    const skills = normalizeSkillLabels(
      ["laadunvarmistus", "quality assurance", "Laadunvarmistus"],
      "explicit_skill",
    );
    expect(skills).toHaveLength(1);
    expect(skills[0]?.id).toBe("quality_assurance");
  });

  it("marks overly generic labels and keeps them out of overlap", () => {
    expect(isGenericSkillText("työ")).toBe(true);
    expect(isGenericSkillText("communication")).toBe(true);
    expect(isGenericSkillText("tehtäväkuvauksen tarkentaminen")).toBe(true);
    const generic = normalizeSkillLabel("vastuu", "explicit_skill");
    const concrete = normalizeSkillLabel("asiakasymmärrys", "explicit_skill");
    expect(generic?.generic).toBe(true);
    expect(concrete?.generic).toBe(false);
    expect(transferableOverlap([generic!], [concrete!])).toBe(0);
  });

  it("does not treat raw task labels as silent transferable skills", () => {
    const occupation = testOccupation("2512", { recommendedSkills: [] });
    const skills = skillsFromOccupation({ ...occupation, classifiedSkills: [] });
    expect(skills.some((item) => item.source === "normalized_task")).toBe(true);
    expect(skills.every((item) => item.source !== "explicit_skill" || item.category === "formal_qualification")).toBe(
      true,
    );
  });

  it("preserves missing skills as an empty deterministic overlap", () => {
    expect(deterministicOverlapScore([], [])).toBe(0);
    expect(normalizeSkillLabel("Laadunvarmistus", "explicit_skill")?.id).toBe("quality_assurance");
    expect(normalizeSkillLabel("kvalitetssäkring", "explicit_skill")?.id).toBe("quality_assurance");
    expect(foldSkillText("Laadunvarmistus")).toBe("laadunvarmistus");
  });

  it("returns the same overlap score for the same inputs", () => {
    const left = normalizeSkillLabels(["koordinointi", "asiakasymmärrys"], "explicit_skill");
    const right = normalizeSkillLabels(["samordning", "kundförståelse"], "explicit_skill");
    expect(deterministicOverlapScore(left, right)).toBe(deterministicOverlapScore(left, right));
    expect(deterministicOverlapScore(left, right)).toBeGreaterThan(0.9);
  });
});

import { buildCoverageReport } from "./coverage/report";
import { isUnclassifiedOccupation } from "./occupation-view";
import type { Occupation } from "./schemas/occupation";
import {
  careerBridgesResponseSchema,
  type BridgeFactors,
  type BridgeReason,
  type CareerBridge,
  type CareerBridgesResponse,
} from "./schemas/bridges";
import { HUMAN_CRITICAL_CATEGORIES } from "./schemas/skills";
import {
  BRIDGE_LIMIT,
  BRIDGE_MIN_COMPLETENESS,
  BRIDGE_MIN_SCORE,
  BRIDGE_TIE_EPSILON,
  BRIDGE_WEIGHTS,
} from "./scoring/weights";
import {
  missingOccupationSpecific,
  qualificationDistance,
  retainedTransferable,
  transferableOverlap,
} from "./skills/overlap";
import { skillLabel, skillsFromOccupation } from "./skills/normalize";
import { workdayTokens } from "./workday/match";

export type AnalysisLocale = "fi" | "sv" | "en";

function uniqueTokens(items: string[]): string[] {
  const tokens = workdayTokens(items.join(" "));
  const out = new Set<string>();
  for (const token of tokens) {
    out.add(token);
    if (token.length >= 5) out.add(token.slice(0, 5));
  }
  return [...out];
}

function jaccardTokens(a: string[], b: string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const item of left) if (right.has(item)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

function hierarchyProximity(source: Occupation, target: Occupation): { score: number; reason: BridgeReason | null } {
  const a = source.occupationCode;
  const b = target.occupationCode;
  if (a.slice(0, 3) === b.slice(0, 3) && a.length >= 3 && b.length >= 3) {
    return { score: 1, reason: "sameThreeDigit" };
  }
  if (a.slice(0, 2) === b.slice(0, 2) && a.length >= 2 && b.length >= 2) {
    return { score: 0.6, reason: "sameTwoDigit" };
  }
  if (source.majorGroupCode === target.majorGroupCode) {
    return { score: 0.3, reason: "sameMajor" };
  }
  return { score: 0, reason: null };
}

function outlookFactor(source: Occupation, target: Occupation): number {
  if (source.laborMarketOutlook === "unavailable" || target.laborMarketOutlook === "unavailable") {
    return 0.35;
  }
  if (target.laborMarketOutlook === "shortage") return 1;
  if (target.laborMarketOutlook === "balanced") return source.laborMarketOutlook === "surplus" ? 0.85 : 0.7;
  if (target.laborMarketOutlook === "mismatch") return 0.45;
  if (target.laborMarketOutlook === "surplus") {
    return source.laborMarketOutlook === "surplus" ? 0.55 : 0.35;
  }
  return 0.4;
}

function exposureFactor(source: Occupation, target: Occupation): number {
  if (source.theoreticalAIExposure == null || target.theoreticalAIExposure == null) return 0.4;
  const delta = target.theoreticalAIExposure - source.theoreticalAIExposure;
  if (Math.abs(delta) <= 1.5) return 1;
  if (delta < -1.5 && delta >= -4) return 0.7;
  if (delta > 1.5) return 0.45;
  return 0.55;
}

function weightedOverlap(factors: BridgeFactors): number {
  return Number(
    (
      BRIDGE_WEIGHTS.transferableSkillOverlap * factors.transferableSkillOverlap +
      BRIDGE_WEIGHTS.taskOverlap * factors.taskOverlap +
      BRIDGE_WEIGHTS.qualificationDistance * factors.qualificationDistance +
      BRIDGE_WEIGHTS.occupationalGroupProximity * factors.occupationalGroupProximity +
      BRIDGE_WEIGHTS.labourMarketOutlook * factors.labourMarketOutlook +
      BRIDGE_WEIGHTS.aiExposureDifference * factors.aiExposureDifference +
      BRIDGE_WEIGHTS.dataCompleteness * factors.dataCompleteness
    ).toFixed(3),
  );
}

function explainAdjacency(
  locale: AnalysisLocale,
  target: Occupation,
  reasons: BridgeReason[],
  qualificationKnown: boolean,
): string {
  const name =
    locale === "sv" ? target.occupationNameSv : locale === "en" ? target.occupationNameEn : target.occupationNameFi;
  const reasonText = reasons
    .map((reason) => {
      if (locale === "sv") {
        return {
          sameThreeDigit: "samma tresiffriga grupp",
          sameTwoDigit: "samma tvåsiffriga grupp",
          sameMajor: "samma huvudgrupp",
          taskOverlap: "gemensamma uppgifter",
          skillOverlap: "överförbara färdigheter",
          outlook: "officiell arbetsmarknadsutsikt",
          qualification: "dokumenterad behörighet",
          humanCritical: "mänskligt kritiska förmågor",
        }[reason];
      }
      if (locale === "en") {
        return {
          sameThreeDigit: "same 3-digit group",
          sameTwoDigit: "same 2-digit group",
          sameMajor: "same major group",
          taskOverlap: "shared tasks",
          skillOverlap: "transferable skills",
          outlook: "official labour-market outlook",
          qualification: "documented qualification",
          humanCritical: "human-critical capabilities",
        }[reason];
      }
      return {
        sameThreeDigit: "sama 3-numeroryhmä",
        sameTwoDigit: "sama 2-numeroryhmä",
        sameMajor: "sama pääluokka",
        taskOverlap: "yhteiset tehtävät",
        skillOverlap: "siirtokelpoiset taidot",
        outlook: "virallinen työmarkkinanäkymä",
        qualification: "dokumentoitu kelpoisuus",
        humanCritical: "ihmisen vastuulle kuuluvat kyvyt",
      }[reason];
    })
    .filter(Boolean)
    .join(locale === "en" ? "; " : "; ");
  const unknownQual =
    !qualificationKnown &&
    (locale === "en"
      ? " Formal qualification requirements are unavailable."
      : locale === "sv"
        ? " Formella behörighetskrav saknas."
        : " Virallisia kelpoisuusvaatimuksia ei ole saatavilla.");
  if (locale === "en") {
    return `Adjacent to ${name} because of ${reasonText || "structured overlap"}.${unknownQual}`;
  }
  if (locale === "sv") {
    return `Närliggande till ${name} på grund av ${reasonText || "strukturerad överlappning"}.${unknownQual}`;
  }
  return `Läheinen suhteessa ammattiin ${name} koska ${reasonText || "rakenteinen päällekkäisyys"}.${unknownQual}`;
}

export function occupationBridgeScore(
  source: Occupation,
  target: Occupation,
  locale: AnalysisLocale = "fi",
): {
  overlap: number;
  factors: BridgeFactors;
  retainedSkills: string[];
  missingSkills: string[];
  retainedTransferable: CareerBridge["retainedTransferable"];
  missingOccupationSpecific: CareerBridge["missingOccupationSpecific"];
  qualificationBarriers: CareerBridge["qualificationBarriers"];
  qualificationKnown: boolean;
  humanCriticalCapabilities: CareerBridge["humanCriticalCapabilities"];
  reasons: BridgeReason[];
  explanation: string;
  dataCompleteness: number;
  missingEvidence: string[];
  suppressed: boolean;
} {
  const sourceSkills = skillsFromOccupation(source);
  const targetSkills = skillsFromOccupation(target);
  const sourceCoverage = buildCoverageReport(source);
  const targetCoverage = buildCoverageReport(target);
  const skillOverlap = transferableOverlap(sourceSkills, targetSkills);
  const retained = retainedTransferable(sourceSkills, targetSkills);
  const missing = missingOccupationSpecific(sourceSkills, targetSkills);
  const quals = qualificationDistance(sourceSkills, targetSkills);
  const taskOverlap = jaccardTokens(
    uniqueTokens([...source.AIApplicableTasks, ...source.humanCriticalTasks]),
    uniqueTokens([...target.AIApplicableTasks, ...target.humanCriticalTasks]),
  );
  const hierarchy = hierarchyProximity(source, target);
  const pairCompleteness = Number(((sourceCoverage.completeness + targetCoverage.completeness) / 2).toFixed(3));
  const factors: BridgeFactors = {
    transferableSkillOverlap: Number(skillOverlap.toFixed(3)),
    taskOverlap: Number(taskOverlap.toFixed(3)),
    qualificationDistance: Number(quals.score.toFixed(3)),
    occupationalGroupProximity: hierarchy.score,
    labourMarketOutlook: outlookFactor(source, target),
    aiExposureDifference: exposureFactor(source, target),
    dataCompleteness: pairCompleteness,
  };
  const overlap = weightedOverlap(factors);
  const reasons: BridgeReason[] = [];
  if (hierarchy.reason) reasons.push(hierarchy.reason);
  if (taskOverlap >= 0.12) reasons.push("taskOverlap");
  if (skillOverlap >= 0.12 || retained.length > 0) reasons.push("skillOverlap");
  if (
    source.laborMarketOutlook === target.laborMarketOutlook &&
    target.laborMarketOutlook !== "unavailable"
  ) {
    reasons.push("outlook");
  }
  if (quals.known && quals.barriers.length === 0 && qualificationDistance(sourceSkills, targetSkills).known) {
    reasons.push("qualification");
  }
  const humanCritical = targetSkills.filter(
    (skill) => HUMAN_CRITICAL_CATEGORIES.includes(skill.category) && !skill.generic,
  );
  if (humanCritical.length) reasons.push("humanCritical");

  const missingEvidence = [
    ...new Set([
      ...sourceCoverage.missingEvidence.map((item) => `source.${item}`),
      ...targetCoverage.missingEvidence.map((item) => `target.${item}`),
    ]),
  ];
  const titleOnly =
    !hierarchy.reason &&
    taskOverlap < 0.08 &&
    skillOverlap < 0.08 &&
    overlap >= BRIDGE_MIN_SCORE;
  const suppressed =
    pairCompleteness < BRIDGE_MIN_COMPLETENESS ||
    overlap < BRIDGE_MIN_SCORE ||
    Boolean(titleOnly);

  return {
    overlap,
    factors,
    retainedSkills: retained.map((skill) => skillLabel(skill, locale)),
    missingSkills: missing.map((skill) => skillLabel(skill, locale)),
    retainedTransferable: retained,
    missingOccupationSpecific: missing,
    qualificationBarriers: quals.barriers,
    qualificationKnown: quals.known,
    humanCriticalCapabilities: humanCritical,
    reasons,
    explanation: explainAdjacency(locale, target, reasons, quals.known),
    dataCompleteness: pairCompleteness,
    missingEvidence,
    suppressed,
  };
}

function compareBridges(a: CareerBridge, b: CareerBridge): number {
  const delta = b.overlap - a.overlap;
  if (Math.abs(delta) < BRIDGE_TIE_EPSILON) {
    return a.occupationCode.localeCompare(b.occupationCode);
  }
  return delta;
}

export function buildCareerBridges(
  source: Occupation,
  catalog: Occupation[],
  locale: AnalysisLocale = "fi",
): CareerBridgesResponse {
  const candidates = catalog.filter(
    (row) => row.occupationCode !== source.occupationCode && row.level === 4 && !isUnclassifiedOccupation(row),
  );
  const scored = candidates.map((target) => {
    const result = occupationBridgeScore(source, target, locale);
    return {
      occupationCode: target.occupationCode,
      occupationNameFi: target.occupationNameFi,
      occupationNameSv: target.occupationNameSv,
      occupationNameEn: target.occupationNameEn,
      overlap: result.overlap,
      factors: result.factors,
      retainedSkills: result.retainedSkills,
      missingSkills: result.missingSkills,
      retainedTransferable: result.retainedTransferable,
      missingOccupationSpecific: result.missingOccupationSpecific,
      qualificationBarriers: result.qualificationBarriers,
      qualificationKnown: result.qualificationKnown,
      humanCriticalCapabilities: result.humanCriticalCapabilities,
      laborMarketOutlook: target.laborMarketOutlook,
      theoreticalAIExposure: target.theoreticalAIExposure,
      uncertainty: target.uncertainty,
      reasons: result.reasons,
      explanation: result.explanation,
      explanationKind: "calculated" as const,
      dataCompleteness: result.dataCompleteness,
      missingEvidence: result.missingEvidence,
      suppressed: result.suppressed,
    };
  });
  const visible = scored.filter((row) => !row.suppressed).sort(compareBridges).slice(0, BRIDGE_LIMIT);
  return careerBridgesResponseSchema.parse({
    occupationCode: source.occupationCode,
    kind: "calculated",
    explain: "calculated",
    weightsSource: "src/lib/scoring/weights.ts",
    suppressedCount: scored.filter((row) => row.suppressed).length,
    bridges: visible,
  });
}

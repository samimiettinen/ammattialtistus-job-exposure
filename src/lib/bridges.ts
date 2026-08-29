import { isUnclassifiedOccupation } from "./occupation-view";
import type { Occupation } from "./schemas";
import {
  BRIDGE_LIMIT,
  BRIDGE_MIN_SCORE,
  careerBridgesResponseSchema,
  type BridgeReason,
  type CareerBridge,
  type CareerBridgesResponse,
} from "./schemas/bridges";
import { workdayTokens } from "./workday/match";

function skillItems(occupation: Occupation): string[] {
  const preferred = (occupation.recommendedSkills ?? []).map((item) => item.trim()).filter(Boolean);
  if (preferred.length) return unique(preferred);
  return unique([...occupation.AIApplicableTasks, ...occupation.humanCriticalTasks]);
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLocaleLowerCase("fi");
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function itemRelated(a: string, b: string): boolean {
  const left = a.toLocaleLowerCase("fi");
  const right = b.toLocaleLowerCase("fi");
  if (left === right) return true;
  const stem = (value: string) => value.slice(0, Math.min(5, value.length));
  if (left.length >= 4 && right.includes(stem(left))) return true;
  if (right.length >= 4 && left.includes(stem(right))) return true;
  return false;
}

function jaccardTokens(a: string[], b: string[]): number {
  const left = new Set(a);
  const right = new Set(b);
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const item of left) if (right.has(item)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

function hierarchyScore(source: Occupation, target: Occupation): { score: number; reason: BridgeReason | null } {
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
  return { score: 0.05, reason: null };
}

function outlookScore(source: Occupation, target: Occupation): number {
  if (source.laborMarketOutlook === "unavailable" || target.laborMarketOutlook === "unavailable") return 0.3;
  return source.laborMarketOutlook === target.laborMarketOutlook ? 1 : 0.4;
}

export function occupationBridgeScore(source: Occupation, target: Occupation): {
  overlap: number;
  retainedSkills: string[];
  missingSkills: string[];
  reasons: BridgeReason[];
} {
  const sourceSkills = skillItems(source);
  const targetSkills = skillItems(target);
  const retainedSkills = targetSkills.filter((item) => sourceSkills.some((other) => itemRelated(item, other)));
  const missingSkills = targetSkills.filter((item) => !retainedSkills.includes(item));
  const skillJaccard =
    sourceSkills.length && targetSkills.length ? retainedSkills.length / unique([...sourceSkills, ...targetSkills]).length : 0;
  const taskJaccard = jaccardTokens(
    workdayTokens([...source.AIApplicableTasks, ...source.humanCriticalTasks, source.occupationNameFi].join(" ")),
    workdayTokens([...target.AIApplicableTasks, ...target.humanCriticalTasks, target.occupationNameFi].join(" ")),
  );
  const hierarchy = hierarchyScore(source, target);
  const outlook = outlookScore(source, target);
  const overlap = Math.min(
    1,
    0.48 * taskJaccard + 0.22 * skillJaccard + 0.25 * hierarchy.score + 0.05 * outlook,
  );
  const reasons: BridgeReason[] = [];
  if (hierarchy.reason) reasons.push(hierarchy.reason);
  if (taskJaccard >= 0.15 || retainedSkills.length > 0) reasons.push("taskOverlap");
  if (source.laborMarketOutlook === target.laborMarketOutlook && target.laborMarketOutlook !== "unavailable") {
    reasons.push("outlook");
  }
  return {
    overlap: Number(overlap.toFixed(3)),
    retainedSkills,
    missingSkills,
    reasons,
  };
}

export function buildCareerBridges(source: Occupation, catalog: Occupation[]): CareerBridgesResponse {
  const candidates = catalog.filter(
    (row) =>
      row.occupationCode !== source.occupationCode &&
      row.level === 4 &&
      !isUnclassifiedOccupation(row),
  );
  const bridges: CareerBridge[] = candidates
    .map((target) => {
      const scored = occupationBridgeScore(source, target);
      return {
        occupationCode: target.occupationCode,
        occupationNameFi: target.occupationNameFi,
        occupationNameSv: target.occupationNameSv,
        occupationNameEn: target.occupationNameEn,
        overlap: scored.overlap,
        retainedSkills: scored.retainedSkills,
        missingSkills: scored.missingSkills,
        laborMarketOutlook: target.laborMarketOutlook,
        theoreticalAIExposure: target.theoreticalAIExposure,
        uncertainty: target.uncertainty,
        reasons: scored.reasons,
        explanationKind: "calculated" as const,
      };
    })
    .filter((row) => row.overlap >= BRIDGE_MIN_SCORE)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, BRIDGE_LIMIT);

  return careerBridgesResponseSchema.parse({
    occupationCode: source.occupationCode,
    kind: "calculated",
    explain: "calculated",
    bridges,
  });
}

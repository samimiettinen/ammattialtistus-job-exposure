import type { ClassifiedSkill, SkillCategory } from "../schemas/skills";
import { OVERLAP_SKILL_CATEGORIES, QUALIFICATION_CATEGORIES } from "../schemas/skills";

export function overlapIds(skills: ClassifiedSkill[], categories?: SkillCategory[]): Set<string> {
  const allowed = categories ? new Set(categories) : null;
  const ids = new Set<string>();
  for (const skill of skills) {
    if (skill.generic) continue;
    if (allowed && !allowed.has(skill.category)) continue;
    ids.add(skill.id);
  }
  return ids;
}

export function jaccardIds(left: Set<string>, right: Set<string>): number {
  if (!left.size && !right.size) return 0;
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const id of left) if (right.has(id)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

export function transferableOverlap(source: ClassifiedSkill[], target: ClassifiedSkill[]): number {
  return jaccardIds(overlapIds(source, OVERLAP_SKILL_CATEGORIES), overlapIds(target, OVERLAP_SKILL_CATEGORIES));
}

export function retainedTransferable(source: ClassifiedSkill[], target: ClassifiedSkill[]): ClassifiedSkill[] {
  const sourceIds = overlapIds(source, OVERLAP_SKILL_CATEGORIES);
  const seen = new Set<string>();
  const out: ClassifiedSkill[] = [];
  for (const skill of target) {
    if (skill.generic || !OVERLAP_SKILL_CATEGORIES.includes(skill.category)) continue;
    if (!sourceIds.has(skill.id) || seen.has(skill.id)) continue;
    seen.add(skill.id);
    out.push(skill);
  }
  return out;
}

export function missingOccupationSpecific(source: ClassifiedSkill[], target: ClassifiedSkill[]): ClassifiedSkill[] {
  const sourceIds = overlapIds(source, ["occupation_specific", "tools_technologies"]);
  const seen = new Set<string>();
  const out: ClassifiedSkill[] = [];
  for (const skill of target) {
    if (skill.generic) continue;
    if (skill.category !== "occupation_specific" && skill.category !== "tools_technologies") continue;
    if (sourceIds.has(skill.id) || seen.has(skill.id)) continue;
    seen.add(skill.id);
    out.push(skill);
  }
  return out;
}

export function qualificationSkills(skills: ClassifiedSkill[]): ClassifiedSkill[] {
  return skills.filter((skill) => QUALIFICATION_CATEGORIES.includes(skill.category) && !skill.generic);
}

export function qualificationDistance(source: ClassifiedSkill[], target: ClassifiedSkill[]): {
  score: number;
  barriers: ClassifiedSkill[];
  known: boolean;
} {
  const sourceQ = qualificationSkills(source);
  const targetQ = qualificationSkills(target);
  if (!sourceQ.length && !targetQ.length) {
    return { score: 0.5, barriers: [], known: false };
  }
  const sourceIds = new Set(sourceQ.map((item) => item.id));
  const barriers = targetQ.filter((item) => !sourceIds.has(item.id));
  if (!targetQ.length) return { score: 0.85, barriers: [], known: true };
  const covered = targetQ.length - barriers.length;
  return { score: covered / targetQ.length, barriers, known: true };
}

export function deterministicOverlapScore(left: ClassifiedSkill[], right: ClassifiedSkill[]): number {
  return Number(transferableOverlap(left, right).toFixed(3));
}

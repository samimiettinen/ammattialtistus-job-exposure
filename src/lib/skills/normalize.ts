import type { Occupation } from "../schemas/occupation";
import {
  classifiedSkillSchema,
  type ClassifiedSkill,
  type SkillSource,
} from "../schemas/skills";
import {
  foldSkillText,
  GENERIC_SKILL_TOKENS,
  qualificationHintsFromDescription,
  SYNONYM_INDEX,
  TAXONOMY_BY_ID,
} from "./taxonomy";

export function isGenericSkillText(value: string): boolean {
  const folded = foldSkillText(value);
  if (!folded) return true;
  if (GENERIC_SKILL_TOKENS.has(folded)) return true;
  const tokens = folded.split(" ");
  return tokens.length === 1 && GENERIC_SKILL_TOKENS.has(tokens[0]!);
}

function slugId(folded: string): string {
  const slug = folded.replace(/\s+/g, "_").slice(0, 48);
  return `occ:${slug || "unknown"}`;
}

export function normalizeSkillLabel(raw: string, source: SkillSource): ClassifiedSkill | null {
  const original = raw.trim();
  if (!original) return null;
  const folded = foldSkillText(original);
  if (!folded) return null;

  if (isGenericSkillText(original)) {
    return classifiedSkillSchema.parse({
      id: `generic:${folded.replace(/\s+/g, "_")}`,
      category: "transferable",
      labels: { fi: original, sv: original, en: original },
      source,
      original,
      generic: true,
    });
  }

  const hit = SYNONYM_INDEX.find((item) => item.folded === folded || folded.includes(item.folded));
  if (hit) {
    return classifiedSkillSchema.parse({
      id: hit.entry.id,
      category: hit.entry.category,
      labels: hit.entry.labels,
      source,
      original,
      generic: false,
    });
  }

  return classifiedSkillSchema.parse({
    id: slugId(folded),
    category: "occupation_specific",
    labels: { fi: original, sv: original, en: original },
    source,
    original,
    generic: false,
  });
}

export function normalizeSkillLabels(raw: string[], source: SkillSource): ClassifiedSkill[] {
  const out: ClassifiedSkill[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const classified = normalizeSkillLabel(item, source);
    if (!classified) continue;
    if (seen.has(classified.id)) continue;
    seen.add(classified.id);
    out.push(classified);
  }
  return out;
}

export function mergeClassifiedSkills(groups: ClassifiedSkill[][]): ClassifiedSkill[] {
  const byId = new Map<string, ClassifiedSkill>();
  const sourceRank: Record<SkillSource, number> = {
    explicit_skill: 3,
    user_workday: 2,
    normalized_task: 1,
  };
  for (const group of groups) {
    for (const skill of group) {
      const existing = byId.get(skill.id);
      if (!existing || sourceRank[skill.source] > sourceRank[existing.source]) {
        byId.set(skill.id, skill);
      }
    }
  }
  return [...byId.values()];
}

export function skillsFromOccupation(
  occupation: Pick<
    Occupation,
    "recommendedSkills" | "AIApplicableTasks" | "humanCriticalTasks" | "description" | "classifiedSkills"
  >,
  extras: string[] = [],
  extraSource: SkillSource = "user_workday",
): ClassifiedSkill[] {
  if (occupation.classifiedSkills?.length && !extras.length) {
    return occupation.classifiedSkills;
  }
  const explicit = normalizeSkillLabels(occupation.recommendedSkills ?? [], "explicit_skill");
  const fromTasks = normalizeSkillLabels(
    [...occupation.AIApplicableTasks, ...occupation.humanCriticalTasks],
    "normalized_task",
  );
  const fromDescription = qualificationHintsFromDescription(occupation.description).map((entry) =>
    classifiedSkillSchema.parse({
      id: entry.id,
      category: entry.category,
      labels: entry.labels,
      source: "explicit_skill" as const,
      original: entry.labels.fi,
      generic: false,
    }),
  );
  const fromExtras = normalizeSkillLabels(extras, extraSource);
  return mergeClassifiedSkills([occupation.classifiedSkills ?? [], explicit, fromTasks, fromDescription, fromExtras]);
}

export function skillLabel(skill: ClassifiedSkill, locale: string): string {
  if (locale === "sv") return skill.labels.sv;
  if (locale === "en") return skill.labels.en;
  return skill.labels.fi;
}

export function taxonomyLocalisationConsistent(): boolean {
  return [...TAXONOMY_BY_ID.values()].every(
    (entry) => entry.labels.fi.trim() && entry.labels.sv.trim() && entry.labels.en.trim(),
  );
}

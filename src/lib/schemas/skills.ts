import { z } from "zod";

export const skillCategorySchema = z.enum([
  "transferable",
  "occupation_specific",
  "tools_technologies",
  "formal_qualification",
  "interpersonal",
  "decision_responsibility",
  "physical_embodied",
]);
export type SkillCategory = z.infer<typeof skillCategorySchema>;

export const skillSourceSchema = z.enum(["explicit_skill", "normalized_task", "user_workday"]);
export type SkillSource = z.infer<typeof skillSourceSchema>;

export const skillLabelsSchema = z.object({
  fi: z.string().min(1),
  sv: z.string().min(1),
  en: z.string().min(1),
});
export type SkillLabels = z.infer<typeof skillLabelsSchema>;

export const classifiedSkillSchema = z.object({
  id: z.string().min(1),
  category: skillCategorySchema,
  labels: skillLabelsSchema,
  source: skillSourceSchema,
  original: z.string().min(1),
  generic: z.boolean(),
});
export type ClassifiedSkill = z.infer<typeof classifiedSkillSchema>;

export const TRANSFERABLE_CATEGORIES: SkillCategory[] = ["transferable", "interpersonal"];
export const OVERLAP_SKILL_CATEGORIES: SkillCategory[] = [
  "transferable",
  "interpersonal",
  "tools_technologies",
];
export const QUALIFICATION_CATEGORIES: SkillCategory[] = ["formal_qualification"];
export const HUMAN_CRITICAL_CATEGORIES: SkillCategory[] = [
  "interpersonal",
  "decision_responsibility",
  "physical_embodied",
];

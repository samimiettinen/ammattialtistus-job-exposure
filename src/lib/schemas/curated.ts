import { z } from "zod";
import { skillCategorySchema } from "./skills";

/**
 * Curated "golden set" profiles.
 *
 * This is a THIRD data class, next to official statistics and AI estimates:
 * hand-written expert assessment. It is the most dangerous kind of content in
 * this product, because it reads as authoritative while resting on no
 * statistical source. Everything here therefore carries its own provenance,
 * its own review dates, and its own gate.
 *
 * Two invariants come from the source material itself and must not be relaxed:
 *
 *  1. `aiAssistance` and `humanCriticality` are INDEPENDENT axes. A task can be
 *     high on both. Neither is derived from the other, and the UI must never
 *     render them as two ends of one scale.
 *  2. AI-assistance scores carry their OWN review date, because tool capability
 *     moves faster than the rest of the card. A stale axis is shown as stale,
 *     never silently as current.
 *
 * A curated axis is also never mixed with the catalog's own 0–10 occupation
 * scores. Different grain, different provenance, different lifecycle.
 */

export const CURATED_AXIS_MIN = 1;
export const CURATED_AXIS_MAX = 5;

export const curatedStatusSchema = z.enum(["draft", "panel_reviewed"]);
export type CuratedStatus = z.infer<typeof curatedStatusSchema>;

/**
 * How precisely a source pins the thing it is cited for. A `site` reference
 * (e.g. a taxonomy front page) may be listed but must never be presented as
 * anchoring a specific card — the source material's own critique log flagged
 * exactly this weakness in its ESCO reference.
 */
export const curatedSourcePrecisionSchema = z.enum(["occupation_uri", "document", "site"]);
export type CuratedSourcePrecision = z.infer<typeof curatedSourcePrecisionSchema>;

export const curatedSourceSchema = z.object({
  url: z.string().url(),
  label: z.string().min(1),
  precision: curatedSourcePrecisionSchema,
  retrievedAt: z.string().nullable(),
});
export type CuratedSource = z.infer<typeof curatedSourceSchema>;

/** One judged axis: a 1–5 value, the reasoning for it, and when it was judged. */
export const curatedAxisSchema = z.object({
  value: z.number().int().min(CURATED_AXIS_MIN).max(CURATED_AXIS_MAX).nullable(),
  why: z.string().min(1).nullable(),
  reviewedAt: z.string().nullable(),
});
export type CuratedAxis = z.infer<typeof curatedAxisSchema>;

/** Panel scoring criteria, all 1–5, as specified by the source material. */
export const curatedPanelScoresSchema = z.object({
  frequency: z.number().int().min(1).max(5).nullable(),
  importance: z.number().int().min(1).max(5).nullable(),
  juniorShare: z.number().int().min(1).max(5).nullable(),
  aiAssistance: z.number().int().min(1).max(5).nullable(),
});
export type CuratedPanelScores = z.infer<typeof curatedPanelScoresSchema>;

export const curatedTaskSchema = z.object({
  taskId: z.string().min(1),
  moduleId: z.string().min(1),
  titleFi: z.string().min(1),
  descriptionFi: z.string().min(1),
  aiAssistance: curatedAxisSchema,
  humanCriticality: curatedAxisSchema,
  panelScores: curatedPanelScoresSchema.nullable().default(null),
  sources: z.array(curatedSourceSchema).default([]),
  /** Retained for editors, never rendered. See CURATED_UI_FORBIDDEN_HOSTS. */
  researchOnlyRefs: z.array(curatedSourceSchema).default([]),
  status: curatedStatusSchema.default("draft"),
  validatedBy: z.number().int().nonnegative().default(0),
  reviewedAt: z.string().nullable().default(null),
});
export type CuratedTask = z.infer<typeof curatedTaskSchema>;

export const curatedModuleSchema = z.object({
  moduleId: z.string().min(1),
  nameFi: z.string().min(1),
  /** `core` applies to every path; `path` is selectable in the guided form. */
  kind: z.enum(["core", "path"]),
});
export type CuratedModule = z.infer<typeof curatedModuleSchema>;

/**
 * A curated profile spans several AML 2010 codes with differing strength.
 * It is not an occupation and never shadows one.
 */
export const curatedAnchorSchema = z.object({
  occupationCode: z.string().min(1),
  strength: z.enum(["primary", "secondary"]),
  note: z.string().nullable().default(null),
});
export type CuratedAnchor = z.infer<typeof curatedAnchorSchema>;

export const curatedPanelSchema = z.object({
  mainPanel: z.array(z.string().min(1)).default([]),
  supplementaryPanel: z.array(z.string().min(1)).default([]),
  criteria: z
    .array(z.object({ id: z.string().min(1), nameFi: z.string().min(1), guidanceFi: z.string().min(1) }))
    .default([]),
  disagreementRuleFi: z.string().nullable().default(null),
  /** Re-review interval for the AI-assistance axis specifically. */
  aiReviewIntervalMonths: z.number().int().positive().nullable().default(null),
});
export type CuratedPanel = z.infer<typeof curatedPanelSchema>;

/** Editorial audit trail — the curated counterpart of the coverage report. */
export const curatedCritiqueRoundSchema = z.object({
  round: z.number().int().positive(),
  outcome: z.string().min(1),
  findingFi: z.string().nullable().default(null),
  resolutionFi: z.string().nullable().default(null),
});
export type CuratedCritiqueRound = z.infer<typeof curatedCritiqueRoundSchema>;

export const curatedSkillSchema = z.object({
  /** Reuses SKILL_TAXONOMY ids where one exists; no second vocabulary. */
  skillId: z.string().min(1),
  category: skillCategorySchema,
  labelFi: z.string().min(1),
});
export type CuratedSkill = z.infer<typeof curatedSkillSchema>;

export const curatedProfileSchema = z.object({
  profileId: z.string().min(1),
  nameFi: z.string().min(1),
  nameSv: z.string().min(1),
  nameEn: z.string().min(1),
  descriptionFi: z.string().min(1),
  /** Card text is Finnish only; the surrounding UI is fi/sv/en. */
  contentLanguage: z.literal("fi"),
  anchors: z.array(curatedAnchorSchema).min(1),
  modules: z.array(curatedModuleSchema).min(1),
  tasks: z.array(curatedTaskSchema).min(1),
  skills: z.array(curatedSkillSchema).default([]),
  panel: curatedPanelSchema,
  critiqueLog: z.array(curatedCritiqueRoundSchema).default([]),
  sources: z.array(curatedSourceSchema).default([]),
  researchOnlyRefs: z.array(curatedSourceSchema).default([]),
  status: curatedStatusSchema.default("draft"),
  validatedBy: z.number().int().nonnegative().default(0),
  reviewedAt: z.string().nullable().default(null),
  compiledAt: z.string(),
});
export type CuratedProfile = z.infer<typeof curatedProfileSchema>;

export const curatedCatalogSchema = z.object({
  generatedAt: z.string(),
  profiles: z.array(curatedProfileSchema),
});
export type CuratedCatalog = z.infer<typeof curatedCatalogSchema>;

/**
 * Hosts that may inform an editor but must never be cited in the UI. The
 * product rule forbids presenting US occupational classifications as a
 * description of the Finnish labour market; O*NET/SOC belong in
 * `researchOnlyRefs`, never in `sources`.
 */
export const CURATED_UI_FORBIDDEN_HOSTS = ["onetonline.org", "onetcenter.org", "bls.gov"] as const;

/** Per-profile completeness, reported rather than hidden. */
export const curatedCoverageSchema = z.object({
  profileId: z.string(),
  taskCount: z.number().int().nonnegative(),
  withAiAssistance: z.number().int().nonnegative(),
  withHumanCriticality: z.number().int().nonnegative(),
  withBothAxes: z.number().int().nonnegative(),
  withPanelScores: z.number().int().nonnegative(),
  validatedTaskCount: z.number().int().nonnegative(),
  staleAiAxisCount: z.number().int().nonnegative(),
  /** withBothAxes / taskCount, null when there are no tasks. */
  axisCompleteness: z.number().min(0).max(1).nullable(),
  anchorsResolved: z.number().int().nonnegative(),
  anchorsUnresolved: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  ok: z.boolean(),
});
export type CuratedCoverage = z.infer<typeof curatedCoverageSchema>;

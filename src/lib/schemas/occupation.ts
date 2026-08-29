import { z } from "zod";
import { classifiedSkillSchema } from "./skills";

export const uncertaintySchema = z.enum(["low", "medium", "high"]);
export type Uncertainty = z.infer<typeof uncertaintySchema>;

export const laborMarketOutlookSchema = z.enum([
  "shortage",
  "surplus",
  "balanced",
  "mismatch",
  "unavailable",
]);
export type LaborMarketOutlook = z.infer<typeof laborMarketOutlookSchema>;

/**
 * One Työvoimabarometri kohtaanto observation for a single maakunta.
 *
 * Region names come from `GET /api/Paikka/regions` (`groupingId` == `regions.id`,
 * verified in docs/SOURCE_DATA_MAPPING.md §3.2). They stay null when that lookup
 * is unavailable rather than being guessed from the UUID.
 *
 * Counts flagged as censored by the barometer are stored as null, so a
 * secrecy-suppressed figure can never render as a zero.
 */
export const regionalOutlookSchema = z.object({
  regionId: z.string(),
  regionCode: z.string().nullable(),
  regionName: z.string().nullable(),
  laborMarketOutlook: laborMarketOutlookSchema,
  matchingState: z.number().int(),
  matchingDegree: z.number().int().min(1).max(5).nullable(),
  employedPersons: z.number().nonnegative().nullable(),
  employedCensored: z.boolean(),
  unemployedJobseekers: z.number().nonnegative().nullable(),
  unemployedCensored: z.boolean(),
  vacancies: z.number().nonnegative().nullable(),
  period: z.string().nullable(),
});
export type RegionalOutlook = z.infer<typeof regionalOutlookSchema>;

export const scoreValueSchema = z.number().min(0).max(10);
export const optionalScoreSchema = scoreValueSchema.nullable();

export const evidenceKindSchema = z.enum(["official", "classification", "ai_estimate"]);
export type EvidenceKind = z.infer<typeof evidenceKindSchema>;

export const evidenceItemSchema = z.object({
  url: z.string().url(),
  kind: evidenceKindSchema,
  label: z.string().optional(),
});
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const occupationSchema = z
  .object({
    occupationCode: z.string().min(1),
    occupationNameFi: z.string().min(1),
    occupationNameSv: z.string().min(1),
    occupationNameEn: z.string().min(1),
    majorGroupCode: z.string().min(1),
    majorGroupName: z.string().min(1),
    parentCode: z.string().nullable().optional(),
    description: z.string(),
    employedPersons: z.number().int().nonnegative().nullable(),
    employmentDataYear: z.number().int().nullable(),
    laborMarketOutlook: laborMarketOutlookSchema,
    shortageSurplusIndex: z.number().nullable(),
    outlookSource: z.string(),
    /** Regional rows behind the national composite. Defaulted so older catalogs still parse. */
    regionalOutlook: z.array(regionalOutlookSchema).default([]),
    theoreticalAIExposure: optionalScoreSchema,
    currentAIAdoption: optionalScoreSchema,
    exposureRangeLow: optionalScoreSchema.default(null),
    exposureRangeHigh: optionalScoreSchema.default(null),
    exposureRationale: z.string().nullable(),
    adoptionRationale: z.string().nullable(),
    exposureReasons: z.array(z.string()).default([]),
    humanCriticalTasks: z.array(z.string()),
    AIApplicableTasks: z.array(z.string()),
    recommendedSkills: z.array(z.string()).default([]),
    classifiedSkills: z.array(classifiedSkillSchema).default([]),
    evidence: z.array(evidenceItemSchema).default([]),
    uncertainty: uncertaintySchema.nullable(),
    sourceUrls: z.array(z.string().url()),
    scoredAt: z.string().nullable(),
    scoringModel: z.string().nullable(),
    promptVersion: z.string().nullable(),
    level: z.number().int().min(1).max(5),
    nameFallbackSv: z.boolean().optional(),
    nameFallbackEn: z.boolean().optional(),
    descriptionAvailable: z.boolean(),
    employmentStale: z.boolean(),
    outlookStale: z.boolean(),
    scoreStatus: z.enum(["llm", "fixture", "unscored"]),
  })
  .refine(
    (row) =>
      row.exposureRangeLow == null ||
      row.exposureRangeHigh == null ||
      row.exposureRangeLow <= row.exposureRangeHigh,
    { message: "exposureRangeLow must be <= exposureRangeHigh" },
  );

export type Occupation = z.infer<typeof occupationSchema>;

export const occupationCatalogSchema = z.object({
  generatedAt: z.string(),
  retrievedAt: z.string(),
  occupations: z.array(occupationSchema),
});

export type OccupationCatalog = z.infer<typeof occupationCatalogSchema>;

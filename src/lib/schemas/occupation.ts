import { z } from "zod";

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

import { z } from "zod";

export const coverageFieldStatusSchema = z.enum([
  "present",
  "missing",
  "stale",
  "fixture",
  "inferred_from_tasks",
  "unavailable",
]);
export type CoverageFieldStatus = z.infer<typeof coverageFieldStatusSchema>;

export const coverageSourceKindSchema = z.enum([
  "official",
  "ai_estimate",
  "user_provided",
  "unavailable",
]);
export type CoverageSourceKind = z.infer<typeof coverageSourceKindSchema>;

export const coverageFieldSchema = z.object({
  status: coverageFieldStatusSchema,
  kind: coverageSourceKindSchema,
  stale: z.boolean().default(false),
});
export type CoverageField = z.infer<typeof coverageFieldSchema>;

export const coverageFieldsSchema = z.object({
  officialEmployment: coverageFieldSchema,
  officialOutlook: coverageFieldSchema,
  officialDescription: coverageFieldSchema,
  aiScores: coverageFieldSchema,
  tasks: coverageFieldSchema,
  skills: coverageFieldSchema,
  qualifications: coverageFieldSchema,
  humanCritical: coverageFieldSchema,
});
export type CoverageFields = z.infer<typeof coverageFieldsSchema>;

export const coverageReportSchema = z.object({
  occupationCode: z.string(),
  completeness: z.number().min(0).max(1),
  fields: coverageFieldsSchema,
  missingEvidence: z.array(z.string()),
  sufficientForBridges: z.boolean(),
  sufficientForSituation: z.boolean(),
  analysisStale: z.boolean(),
  inventedOfficialStats: z.literal(false),
});
export type CoverageReport = z.infer<typeof coverageReportSchema>;

export const catalogCoverageReportSchema = z.object({
  generatedAt: z.string(),
  occupationCount: z.number().int(),
  visualLevel4Count: z.number().int(),
  scoredCount: z.number().int(),
  fixtureScoreCount: z.number().int(),
  llmScoreCount: z.number().int(),
  unscoredCount: z.number().int(),
  employmentCoverage: z.number(),
  outlookCoverage: z.number(),
  skillCoverage: z.number(),
  taskCoverage: z.number(),
  explicitSkillCoverage: z.number(),
  fullCatalogFakeScores: z.boolean(),
  inventedOfficialStats: z.boolean(),
  missingOfficialCount: z.number().int(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  ok: z.boolean(),
});
export type CatalogCoverageReport = z.infer<typeof catalogCoverageReportSchema>;

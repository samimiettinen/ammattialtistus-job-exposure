import { z } from "zod";
import { occupationCatalogSchema } from "./occupation";
import { employmentRowSchema, outlookRecordSchema, parsedOccupationSchema } from "./sources";
import { scoreRecordSchema } from "./scores";

export const catalogProvenanceSchema = z.object({
  retrievedAt: z.string(),
  classification: z.object({
    localId: z.string(),
    url: z.string(),
    itemCount: z.number().int(),
  }),
  employment: z.object({
    tableId: z.string(),
    year: z.number().int(),
    url: z.string(),
    updated: z.string().nullable(),
    rowCount: z.number().int(),
  }),
  outlook: z.object({
    period: z.string().nullable(),
    catalogUrl: z.string(),
    observationUrlTemplate: z.string(),
    occupationCount: z.number().int(),
    aggregation: z.string(),
  }),
});

export type CatalogProvenance = z.infer<typeof catalogProvenanceSchema>;

export const pipelineArtifactsSchema = z.object({
  occupations: z.array(parsedOccupationSchema),
  employment: z.array(employmentRowSchema),
  outlook: z.array(outlookRecordSchema),
  scores: z.array(scoreRecordSchema),
});

export const validationReportSchema = z.object({
  ok: z.boolean(),
  generatedAt: z.string(),
  occupationCount: z.number().int(),
  uniqueCodes: z.boolean(),
  scoredCount: z.number().int(),
  fixtureScoreCount: z.number().int(),
  llmScoreCount: z.number().int(),
  unscoredCount: z.number().int(),
  employmentCoverage: z.number(),
  outlookCoverage: z.number(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type ValidationReport = z.infer<typeof validationReportSchema>;

export const mergedCatalogFileSchema = occupationCatalogSchema.extend({
  provenance: catalogProvenanceSchema,
}).passthrough();

export type MergedCatalogFile = z.infer<typeof mergedCatalogFileSchema>;

export const occupationQuerySchema = z.object({
  q: z.string().optional(),
  group: z.string().optional(),
  outlook: z.string().optional(),
  minEmployment: z.coerce.number().optional(),
  maxEmployment: z.coerce.number().optional(),
  minExposure: z.coerce.number().optional(),
  maxExposure: z.coerce.number().optional(),
  minAdoption: z.coerce.number().optional(),
  maxAdoption: z.coerce.number().optional(),
  scoreStatus: z.enum(["llm", "fixture", "unscored", "scored"]).optional(),
  level: z.coerce.number().int().min(1).max(5).optional(),
  code: z.string().optional(),
});

export type OccupationQuery = z.infer<typeof occupationQuerySchema>;

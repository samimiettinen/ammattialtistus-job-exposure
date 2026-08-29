import { z } from "zod";
import { evidenceItemSchema, optionalScoreSchema, uncertaintySchema } from "./occupation";

export const PROMPT_VERSION = "2026-08-29.1";
export const FIXTURE_MODEL = "fixture/2026-08-29";

export const scoreRecordSchema = z.object({
  occupationCode: z.string().min(1),
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
  scoredAt: z.string().nullable(),
  scoringModel: z.string().nullable(),
  promptVersion: z.string().nullable(),
  sourceDataHash: z.string().nullable(),
});

export type ScoreRecord = z.infer<typeof scoreRecordSchema>;

export const llmScoreResponseSchema = z.object({
  theoreticalAIExposure: z.number().min(0).max(10),
  currentAIAdoption: z.number().min(0).max(10),
  exposureRationale: z.string().min(1),
  adoptionRationale: z.string().min(1),
  humanCriticalTasks: z.array(z.string()).min(1),
  AIApplicableTasks: z.array(z.string()).min(1),
  recommendedSkills: z.array(z.string()).optional(),
  exposureRangeLow: z.number().min(0).max(10).optional(),
  exposureRangeHigh: z.number().min(0).max(10).optional(),
  exposureReasons: z.array(z.string()).max(5).optional(),
  uncertainty: uncertaintySchema,
  distinguishesExposureFromDisplacement: z.literal(true),
});

export type LlmScoreResponse = z.infer<typeof llmScoreResponseSchema>;

export const scoreCacheKeySchema = z.object({
  occupationCode: z.string(),
  promptVersion: z.string(),
  sourceDataHash: z.string(),
  scoringModel: z.string(),
});

export type ScoreCacheKey = z.infer<typeof scoreCacheKeySchema>;

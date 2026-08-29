import { z } from "zod";
import { careerBridgesResponseSchema } from "./bridges";
import { occupationAnalysisSchema } from "./situation";

export const WORKDAY_PROMPT_VERSION = "2026-08-29.workday.1";
export const WORKDAY_TEXT_MIN = 20;
export const WORKDAY_TEXT_MAX = 2000;
export const WORKDAY_TITLE_MAX = 160;

export const workdayLocaleSchema = z.enum(["fi", "sv", "en"]);

export const workdayRequestSchema = z.object({
  locale: workdayLocaleSchema.default("fi"),
  occupationCode: z.string().trim().min(1).max(8).optional(),
  jobTitle: z.string().trim().max(WORKDAY_TITLE_MAX).optional(),
  workdayText: z.string().trim().min(WORKDAY_TEXT_MIN).max(WORKDAY_TEXT_MAX),
});

export type WorkdayRequest = z.infer<typeof workdayRequestSchema>;

export const taskClassificationSchema = z.enum(["accelerate", "assist", "human", "insufficient"]);
export type TaskClassification = z.infer<typeof taskClassificationSchema>;

export const workdayTaskSchema = z.object({
  text: z.string().min(1).max(400),
  classification: taskClassificationSchema,
});

export const shareRangeSchema = z
  .object({
    low: z.number().min(0).max(1),
    high: z.number().min(0).max(1),
  })
  .refine((range) => range.low <= range.high, { message: "range low must be <= high" });

export const workdayMatchSchema = z.object({
  occupationCode: z.string(),
  occupationNameFi: z.string(),
  occupationNameSv: z.string(),
  occupationNameEn: z.string(),
  confidence: z.number().min(0).max(1),
  level: z.number().int(),
});

export const FORBIDDEN_WORKDAY_KEYS = [
  "salary",
  "wage",
  "palkka",
  "unemployment",
  "unemploymentProbability",
  "tyottomyys",
  "työttömyys",
  "jobLoss",
  "legalRequirement",
  "lainsaadanto",
  "lainsäädäntö",
] as const;

export const workdayLlmOutputSchema = z.object({
  tasks: z.array(workdayTaskSchema).min(8).max(12),
  accelerateShareLow: z.number().min(0).max(1),
  accelerateShareHigh: z.number().min(0).max(1),
  automatableShareLow: z.number().min(0).max(1),
  automatableShareHigh: z.number().min(0).max(1),
  recommendedSkills: z.array(z.string().min(1).max(160)).min(3).max(5),
  distinguishesExposureFromDisplacement: z.literal(true),
});

export type WorkdayLlmOutput = z.infer<typeof workdayLlmOutputSchema>;

export const workdayCitationSchema = z.object({
  url: z.string().url(),
  kind: z.enum(["official", "classification", "occupation_record"]),
  occupationCode: z.string(),
});

export const workdayResponseSchema = z.object({
  kind: z.literal("ai_estimate"),
  status: z.enum(["ok", "ambiguous", "no_match", "unavailable"]),
  distinguishesExposureFromDisplacement: z.literal(true),
  fixture: z.boolean(),
  disclaimer: z.string(),
  locale: workdayLocaleSchema,
  matches: z.array(workdayMatchSchema).max(3),
  selectedOccupationCode: z.string().nullable(),
  tasks: z.array(workdayTaskSchema),
  accelerateShare: shareRangeSchema.nullable(),
  automatableShare: shareRangeSchema.nullable(),
  recommendedSkills: z.array(z.string()),
  citations: z.array(workdayCitationSchema),
  model: z.string().nullable(),
  promptVersion: z.string(),
  scoredAt: z.string(),
  analysis: occupationAnalysisSchema.optional(),
  careerBridges: careerBridgesResponseSchema.optional(),
});

export type WorkdayResponse = z.infer<typeof workdayResponseSchema>;

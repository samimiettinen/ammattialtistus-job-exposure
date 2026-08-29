import { z } from "zod";
import { coverageReportSchema } from "./coverage";
import { classifiedSkillSchema } from "./skills";

export const recommendationCategorySchema = z.enum([
  "explore_adjacent_now",
  "strengthen_current_role",
  "document_and_verify",
  "insufficient_evidence",
]);
export type RecommendationCategory = z.infer<typeof recommendationCategorySchema>;

export const situationSignalSchema = z.object({
  id: z.enum([
    "highRecurringTaskExposure",
    "weakOfficialOutlook",
    "strongTransferableOverlap",
    "sufficientData",
  ]),
  present: z.boolean(),
  kind: z.enum(["official", "ai_estimate", "calculated", "unavailable"]),
  detail: z.string(),
});
export type SituationSignal = z.infer<typeof situationSignalSchema>;

export const situationAssessmentSchema = z.object({
  category: recommendationCategorySchema,
  summary: z.string().min(1),
  why: z.array(z.string()).min(1),
  missingEvidence: z.array(z.string()),
  signals: z.array(situationSignalSchema),
  independentSignalCount: z.number().int().min(0),
  derivedFromExposureAlone: z.boolean(),
  locale: z.enum(["fi", "sv", "en"]),
});
export type SituationAssessment = z.infer<typeof situationAssessmentSchema>;

export const nextActionKindSchema = z.enum([
  "test_ai_on_task",
  "interview_adjacent",
  "short_intro_module",
  "document_coordination",
  "compare_qualifications",
]);
export type NextActionKind = z.infer<typeof nextActionKindSchema>;

export const nextActionSchema = z.object({
  id: z.string(),
  kind: nextActionKindSchema,
  title: z.string().min(1),
  detail: z.string().min(1),
  why: z.string().min(1),
  missingEvidence: z.array(z.string()),
  connectedTo: z.string().min(1),
  testable: z.literal(true),
});
export type NextAction = z.infer<typeof nextActionSchema>;

export const valuableCapabilitySchema = z.object({
  skill: classifiedSkillSchema,
  why: z.string(),
});
export type ValuableCapability = z.infer<typeof valuableCapabilitySchema>;

export const occupationAnalysisSchema = z.object({
  occupationCode: z.string(),
  locale: z.enum(["fi", "sv", "en"]),
  coverage: coverageReportSchema,
  situation: situationAssessmentSchema,
  capabilities: z.array(valuableCapabilitySchema),
  classifiedSkills: z.array(classifiedSkillSchema),
  actions: z.array(nextActionSchema).max(3),
  analysisStale: z.boolean(),
});
export type OccupationAnalysis = z.infer<typeof occupationAnalysisSchema>;

import { z } from "zod";
import {
  BRIDGE_LIMIT,
  BRIDGE_MIN_SCORE,
} from "../scoring/weights";
import { laborMarketOutlookSchema, optionalScoreSchema, uncertaintySchema } from "./occupation";
import { classifiedSkillSchema } from "./skills";

export { BRIDGE_LIMIT, BRIDGE_MIN_SCORE };

export const bridgeReasonSchema = z.enum([
  "sameThreeDigit",
  "sameTwoDigit",
  "sameMajor",
  "taskOverlap",
  "skillOverlap",
  "outlook",
  "qualification",
  "humanCritical",
]);
export type BridgeReason = z.infer<typeof bridgeReasonSchema>;

export const bridgeFactorsSchema = z.object({
  transferableSkillOverlap: z.number().min(0).max(1),
  taskOverlap: z.number().min(0).max(1),
  qualificationDistance: z.number().min(0).max(1),
  occupationalGroupProximity: z.number().min(0).max(1),
  labourMarketOutlook: z.number().min(0).max(1),
  aiExposureDifference: z.number().min(0).max(1),
  dataCompleteness: z.number().min(0).max(1),
});
export type BridgeFactors = z.infer<typeof bridgeFactorsSchema>;

export const careerBridgeSchema = z.object({
  occupationCode: z.string(),
  occupationNameFi: z.string(),
  occupationNameSv: z.string(),
  occupationNameEn: z.string(),
  overlap: z.number().min(0).max(1),
  factors: bridgeFactorsSchema,
  retainedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  retainedTransferable: z.array(classifiedSkillSchema),
  missingOccupationSpecific: z.array(classifiedSkillSchema),
  qualificationBarriers: z.array(classifiedSkillSchema),
  qualificationKnown: z.boolean(),
  humanCriticalCapabilities: z.array(classifiedSkillSchema),
  laborMarketOutlook: laborMarketOutlookSchema,
  theoreticalAIExposure: optionalScoreSchema,
  uncertainty: uncertaintySchema.nullable(),
  reasons: z.array(bridgeReasonSchema),
  explanation: z.string(),
  explanationKind: z.literal("calculated"),
  dataCompleteness: z.number().min(0).max(1),
  missingEvidence: z.array(z.string()),
  suppressed: z.boolean().default(false),
});

export type CareerBridge = z.infer<typeof careerBridgeSchema>;

export const careerBridgesResponseSchema = z.object({
  occupationCode: z.string(),
  kind: z.literal("calculated"),
  explain: z.enum(["calculated", "unavailable"]),
  weightsSource: z.literal("src/lib/scoring/weights.ts"),
  suppressedCount: z.number().int().nonnegative(),
  bridges: z.array(careerBridgeSchema),
});

export type CareerBridgesResponse = z.infer<typeof careerBridgesResponseSchema>;

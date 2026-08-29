import { z } from "zod";
import { laborMarketOutlookSchema, optionalScoreSchema, uncertaintySchema } from "./occupation";

export const BRIDGE_LIMIT = 5;
export const BRIDGE_MIN_SCORE = 0.18;

export const bridgeReasonSchema = z.enum([
  "sameThreeDigit",
  "sameTwoDigit",
  "sameMajor",
  "taskOverlap",
  "outlook",
]);
export type BridgeReason = z.infer<typeof bridgeReasonSchema>;

export const careerBridgeSchema = z.object({
  occupationCode: z.string(),
  occupationNameFi: z.string(),
  occupationNameSv: z.string(),
  occupationNameEn: z.string(),
  overlap: z.number().min(0).max(1),
  retainedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  laborMarketOutlook: laborMarketOutlookSchema,
  theoreticalAIExposure: optionalScoreSchema,
  uncertainty: uncertaintySchema.nullable(),
  reasons: z.array(bridgeReasonSchema),
  explanationKind: z.literal("calculated"),
});

export type CareerBridge = z.infer<typeof careerBridgeSchema>;

export const careerBridgesResponseSchema = z.object({
  occupationCode: z.string(),
  kind: z.literal("calculated"),
  explain: z.enum(["calculated", "unavailable"]),
  bridges: z.array(careerBridgeSchema),
});

export type CareerBridgesResponse = z.infer<typeof careerBridgesResponseSchema>;

import { llmScoreResponseSchema, type LlmScoreResponse } from "../schemas/scores";

const FORBIDDEN_OFFICIAL_KEYS = [
  "salary",
  "wage",
  "palkka",
  "employedpersons",
  "employment",
  "tyolliset",
  "työlliset",
  "unemployment",
  "unemploymentprobability",
  "tyottomyys",
  "työttömyys",
  "jobloss",
  "labormarketoutlook",
  "outlook",
];

export function parseLlmScoreResponse(raw: unknown): LlmScoreResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("malformed_model_output");
  }
  const keys = Object.keys(raw as Record<string, unknown>).map((key) => key.toLocaleLowerCase("fi"));
  if (keys.some((key) => FORBIDDEN_OFFICIAL_KEYS.includes(key))) {
    throw new Error("invented_official_stats");
  }
  const parsed = llmScoreResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("malformed_model_output");
  }
  return parsed.data;
}

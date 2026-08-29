import {
  FORBIDDEN_WORKDAY_KEYS,
  shareRangeSchema,
  workdayLlmOutputSchema,
  type WorkdayLlmOutput,
} from "../schemas/workday";
import { hasForbiddenWorkdayKeys } from "./privacy";

export function parseWorkdayModelOutput(raw: unknown): WorkdayLlmOutput {
  if (typeof raw === "string") {
    raw = extractJsonObject(raw);
  }
  if (!raw || typeof raw !== "object") {
    throw new Error("malformed_model_output");
  }
  const forbidden = hasForbiddenWorkdayKeys(raw);
  const extraForbidden = FORBIDDEN_WORKDAY_KEYS.filter((key) => key in (raw as Record<string, unknown>));
  if (forbidden.length || extraForbidden.length) {
    throw new Error("malformed_model_output");
  }
  const parsed = workdayLlmOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("malformed_model_output");
  }
  const ranges = [
    shareRangeSchema.safeParse({
      low: parsed.data.accelerateShareLow,
      high: parsed.data.accelerateShareHigh,
    }),
    shareRangeSchema.safeParse({
      low: parsed.data.automatableShareLow,
      high: parsed.data.automatableShareHigh,
    }),
  ];
  if (ranges.some((range) => !range.success)) {
    throw new Error("malformed_model_output");
  }
  return parsed.data;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "");
  return JSON.parse(trimmed);
}

import { evidenceFromSourceUrls } from "../occupation-analysis";
import type { Occupation } from "../schemas";
import {
  WORKDAY_PROMPT_VERSION,
  workdayRequestSchema,
  workdayResponseSchema,
  type WorkdayRequest,
  type WorkdayResponse,
} from "../schemas/workday";
import { fixtureWorkdayAnalysis } from "./fixture";
import { matchOccupations } from "./match";
import { parseWorkdayModelOutput } from "./parse";
import { WORKDAY_PRIVACY, responseContainsWorkdayText } from "./privacy";
import { workdaySystemPrompt, workdayUserPrompt } from "./prompt";

export type WorkdayCompleteFn = (input: { system: string; user: string }) => Promise<unknown>;

const DISCLAIMER = {
  fi: "Tekoälyn tuottama arvio, ei Tilastokeskuksen, KEHA-keskuksen eikä TEM:n tilasto. AI-altistus ei tarkoita työpaikkojen katoamista.",
  sv: "AI-genererad uppskattning, inte statistik från Statistikcentralen, KEHA eller ANM. AI-altistus ei tarkoita työpaikkojen katoamista.",
  en: "AI-generated estimate, not a Statistics Finland, KEHA or TEM statistic. AI-altistus ei tarkoita työpaikkojen katoamista.",
} as const;

export function analyzeWorkdaySync(args: {
  request: WorkdayRequest;
  catalog: Occupation[];
  modelOutput?: unknown;
  fixture?: boolean;
  model?: string | null;
  now?: Date;
  persist?: (text: string) => void;
}): WorkdayResponse {
  if (args.persist && WORKDAY_PRIVACY.persistFreeText) {
    args.persist(args.request.workdayText);
  }
  const locale = args.request.locale;
  const matched = matchOccupations(args.catalog, args.request);
  const base = {
    kind: "ai_estimate" as const,
    distinguishesExposureFromDisplacement: true as const,
    fixture: Boolean(args.fixture),
    disclaimer: DISCLAIMER[locale],
    locale,
    matches: matched.matches,
    selectedOccupationCode: matched.selected?.occupationCode ?? null,
    tasks: [],
    accelerateShare: null,
    automatableShare: null,
    recommendedSkills: [],
    citations: [] as WorkdayResponse["citations"],
    model: args.model ?? null,
    promptVersion: WORKDAY_PROMPT_VERSION,
    scoredAt: (args.now ?? new Date()).toISOString(),
  };

  if (matched.status !== "selected" || !matched.selected) {
    const response = workdayResponseSchema.parse({ ...base, status: matched.status });
    assertNoEcho(response, args.request.workdayText);
    return response;
  }

  const parsed = args.modelOutput
    ? parseWorkdayModelOutput(args.modelOutput)
    : fixtureWorkdayAnalysis(matched.selected);
  const citations = evidenceFromSourceUrls(matched.selected.sourceUrls).map((item) => ({
    url: item.url,
    kind: item.kind === "ai_estimate" ? "occupation_record" : item.kind,
    occupationCode: matched.selected!.occupationCode,
  }));
  const response = workdayResponseSchema.parse({
    ...base,
    status: "ok",
    selectedOccupationCode: matched.selected.occupationCode,
    tasks: parsed.tasks,
    accelerateShare: { low: parsed.accelerateShareLow, high: parsed.accelerateShareHigh },
    automatableShare: { low: parsed.automatableShareLow, high: parsed.automatableShareHigh },
    recommendedSkills: parsed.recommendedSkills,
    citations,
    fixture: Boolean(args.fixture) || !args.modelOutput,
  });
  assertNoEcho(response, args.request.workdayText);
  return response;
}

export async function analyzeWorkday(args: {
  request: unknown;
  catalog: Occupation[];
  complete?: WorkdayCompleteFn;
  fixture?: boolean;
  model?: string | null;
  persist?: (text: string) => void;
}): Promise<{ ok: true; response: WorkdayResponse } | { ok: false; status: number; error: string }> {
  const parsed = workdayRequestSchema.safeParse(args.request);
  if (!parsed.success) {
    return { ok: false, status: 400, error: "invalid_request" };
  }
  const matched = matchOccupations(args.catalog, parsed.data);
  if (matched.status !== "selected" || !matched.selected) {
    return {
      ok: true,
      response: analyzeWorkdaySync({
        request: parsed.data,
        catalog: args.catalog,
        fixture: args.fixture,
        model: args.model,
        persist: args.persist,
      }),
    };
  }
  if (!args.complete && !args.fixture) {
    return { ok: false, status: 503, error: "model_unavailable" };
  }
  try {
    const modelOutput = args.complete
      ? await args.complete({
          system: workdaySystemPrompt(),
          user: workdayUserPrompt({
            locale: parsed.data.locale,
            workdayText: parsed.data.workdayText,
            jobTitle: parsed.data.jobTitle,
            occupation: matched.selected,
          }),
        })
      : undefined;
    return {
      ok: true,
      response: analyzeWorkdaySync({
        request: parsed.data,
        catalog: args.catalog,
        modelOutput,
        fixture: args.fixture,
        model: args.model,
        persist: args.persist,
      }),
    };
  } catch {
    return { ok: false, status: 502, error: "malformed_model_output" };
  }
}

function assertNoEcho(response: WorkdayResponse, workdayText: string): void {
  if (WORKDAY_PRIVACY.echoWorkdayText) return;
  if (responseContainsWorkdayText(response, workdayText)) {
    throw new Error("privacy_echo");
  }
}

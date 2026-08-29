export const WORKDAY_TIMEOUT_MS = 20_000;

export function workdayModelId(): string {
  return process.env.WORKDAY_MODEL ?? process.env.SCORING_MODEL ?? "gpt-4.1-mini";
}

export function workdayApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY || process.env.SCORING_API_KEY || undefined;
}

export function workdayDevFixtureEnabled(): boolean {
  return process.env.WORKDAY_DEV_FIXTURE === "1";
}

export async function completeWorkdayJson(args: {
  system: string;
  user: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), args.timeoutMs ?? WORKDAY_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${args.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: args.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`workday_provider_http_${response.status}`);
    }
    const body = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty_model_response");
    return JSON.parse(content);
  } finally {
    clearTimeout(timer);
  }
}

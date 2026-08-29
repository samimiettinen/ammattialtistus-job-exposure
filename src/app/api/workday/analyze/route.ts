import { NextResponse } from "next/server";
import { loadCatalog, visualOccupations } from "@/lib/catalog";
import { analyzeWorkday } from "@/lib/workday/analyze";
import { clientKeyFromRequest, consumeWorkdayRateLimit } from "@/lib/workday/rate-limit";
import {
  completeWorkdayJson,
  workdayApiKey,
  workdayDevFixtureEnabled,
  workdayModelId,
  WORKDAY_TIMEOUT_MS,
} from "@/lib/workday/provider";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = consumeWorkdayRateLimit(clientKeyFromRequest(request));
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limited", kind: "ai_estimate" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json", kind: "ai_estimate" }, { status: 400 });
  }

  const catalog = visualOccupations(loadCatalog().occupations);
  const apiKey = workdayApiKey();
  const fixture = workdayDevFixtureEnabled();
  if (!apiKey && !fixture) {
    return NextResponse.json(
      {
        error: "model_unavailable",
        kind: "ai_estimate",
        status: "unavailable",
        distinguishesExposureFromDisplacement: true,
        fixture: false,
      },
      { status: 503 },
    );
  }

  const result = await analyzeWorkday({
    request: body,
    catalog,
    fixture,
    model: fixture ? "fixture/workday" : workdayModelId(),
    complete:
      apiKey && !fixture
        ? ({ system, user }) =>
            completeWorkdayJson({
              system,
              user,
              apiKey,
              model: workdayModelId(),
              timeoutMs: WORKDAY_TIMEOUT_MS,
            })
        : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, kind: "ai_estimate" }, { status: result.status });
  }
  return NextResponse.json(result.response);
}

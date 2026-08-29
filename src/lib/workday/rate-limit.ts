type Bucket = number[];

const hits = new Map<string, Bucket>();

export const WORKDAY_RATE_LIMIT = 10;
export const WORKDAY_RATE_WINDOW_MS = 15 * 60 * 1000;

export function consumeWorkdayRateLimit(
  key: string,
  now = Date.now(),
  limit = WORKDAY_RATE_LIMIT,
  windowMs = WORKDAY_RATE_WINDOW_MS,
): { ok: true } | { ok: false; retryAfterSec: number } {
  const cutoff = now - windowMs;
  const recent = (hits.get(key) ?? []).filter((stamp) => stamp > cutoff);
  if (recent.length >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((recent[0]! + windowMs - now) / 1000));
    hits.set(key, recent);
    return { ok: false, retryAfterSec };
  }
  recent.push(now);
  hits.set(key, recent);
  return { ok: true };
}

export function resetWorkdayRateLimit(): void {
  hits.clear();
}

export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

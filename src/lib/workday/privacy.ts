export const WORKDAY_PRIVACY = {
  persistFreeText: false,
  logRequestBody: false,
  analyticsIncludeText: false,
  echoWorkdayText: false,
} as const;

const FREE_TEXT_KEYS = new Set(["workdaytext", "userworkdaydescription", "freetext", "rawdescription"]);

export function responseContainsWorkdayText(response: unknown, workdayText?: string): boolean {
  if (!response || typeof response !== "object") return false;
  if (objectHasFreeTextKey(response)) return true;
  if (!workdayText || workdayText.trim().length < 80) return false;
  return JSON.stringify(response).includes(workdayText.trim());
}

function objectHasFreeTextKey(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(objectHasFreeTextKey);
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (FREE_TEXT_KEYS.has(key.toLocaleLowerCase("fi"))) return true;
    if (objectHasFreeTextKey(child)) return true;
  }
  return false;
}

export function hasForbiddenWorkdayKeys(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];
  const keys = Object.keys(value as Record<string, unknown>).map((key) => key.toLocaleLowerCase("fi"));
  const forbidden = [
    "salary",
    "wage",
    "palkka",
    "unemployment",
    "unemploymentprobability",
    "tyottomyys",
    "työttömyys",
    "jobloss",
    "legalrequirement",
  ];
  return forbidden.filter((key) => keys.includes(key));
}

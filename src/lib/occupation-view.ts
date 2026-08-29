import type { ColorMetric } from "./colors";
import type { Occupation } from "./schemas";
import { formatNumber } from "./utils";

export const HIGH_THEORETICAL_EXPOSURE_MIN = 7;
export const UNUSED_POTENTIAL_MIN_GAP = 2;
export const LARGEST_GROUP_COUNT = 8;
export const EXAMPLE_OCCUPATION_CODES = ["2512", "5321", "7111"] as const;

export function isUnclassifiedOccupation(occupation: {
  occupationCode: string;
  majorGroupCode?: string;
}): boolean {
  const code = occupation.occupationCode;
  return occupation.majorGroupCode === "X" || code.startsWith("X") || /^X+$/i.test(code);
}

export function residualEmploymentNotice(occupations: Occupation[]): {
  code: string;
  employedPersons: number | null;
  employmentDataYear: number | null;
} {
  const row = occupations.find((item) => item.occupationCode === "XXXX" && item.level === 4);
  return {
    code: "XXXX",
    employedPersons: row?.employedPersons ?? null,
    employmentDataYear: row?.employmentDataYear ?? null,
  };
}

export function exposureReasonsFromRationale(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  const sentences = text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  return sentences.slice(0, 3);
}

export function firstSentence(text: string | null | undefined): string | null {
  return exposureReasonsFromRationale(text)[0] ?? null;
}

export function displayValue(
  value: string | number | null | undefined,
  unavailable: string,
  format?: (value: string | number) => string,
): string {
  if (value == null || value === "") return unavailable;
  return format ? format(value) : String(value);
}

export function listOrUnavailable(items: string[] | null | undefined, unavailable: string): string[] {
  if (!items?.length) return [unavailable];
  return items;
}

export function numberLocale(locale: string): string {
  if (locale === "sv") return "sv-FI";
  if (locale === "en") return "en";
  return "fi-FI";
}

export function formatWorkers(count: number, locale: string): { kind: "millions" | "exact"; value: string } {
  const loc = numberLocale(locale);
  if (count >= 1_000_000) {
    return {
      kind: "millions",
      value: new Intl.NumberFormat(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
        count / 1_000_000,
      ),
    };
  }
  return { kind: "exact", value: formatNumber(count, locale) };
}

export function formatSharePercent(share: number, locale: string): string {
  return new Intl.NumberFormat(numberLocale(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(share * 100);
}

export type ScoreBand = "0" | "12" | "34" | "56" | "78" | "910";

export function scoreBand(value: number): ScoreBand {
  if (value >= 9) return "910";
  if (value >= 7) return "78";
  if (value >= 5) return "56";
  if (value >= 3) return "34";
  if (value >= 1) return "12";
  return "0";
}

export function activeScore(
  occupation: Occupation,
  metric: ColorMetric,
): { value: number | null; kind: "exposure" | "adoption" | "outlook" } {
  if (metric === "adoption") return { value: occupation.currentAIAdoption, kind: "adoption" };
  if (metric === "outlook") return { value: occupation.shortageSurplusIndex, kind: "outlook" };
  return { value: occupation.theoreticalAIExposure, kind: "exposure" };
}

export type DataAvailabilityStatus =
  | "complete"
  | "unscored"
  | "fixture"
  | "missingEmployment"
  | "missingOutlook"
  | "partial";

export function dataAvailabilityStatus(occupation: Occupation): DataAvailabilityStatus {
  const missingEmployment = occupation.employedPersons == null;
  const missingOutlook = occupation.laborMarketOutlook === "unavailable";
  if (occupation.scoreStatus === "unscored" && missingEmployment) return "unscored";
  if (occupation.scoreStatus === "unscored") return "unscored";
  if (missingEmployment) return "missingEmployment";
  if (occupation.scoreStatus === "fixture" && missingOutlook) return "fixture";
  if (occupation.scoreStatus === "fixture") return "fixture";
  if (missingOutlook) return "missingOutlook";
  if (occupation.employmentStale || occupation.outlookStale) return "partial";
  return "complete";
}

export type OccupationDetailModel = {
  code: string;
  official: {
    employed: string;
    year: string;
    outlook: string;
    index: string;
    description: string;
    employmentMissing: boolean;
    employmentStale: boolean;
    outlookMissing: boolean;
  };
  ai: {
    exposure: string;
    adoption: string;
    uncertainty: string;
    reasons: string[];
    aiTasks: string[];
    humanTasks: string[];
    skills: string[];
    scoredAt: string;
    scoringModel: string;
    promptVersion: string;
    status: Occupation["scoreStatus"];
  };
  sources: string[];
  outlookSource: string;
};

export function buildOccupationDetailModel(
  occupation: Occupation,
  args: {
    locale: string;
    unavailable: string;
    outlookLabel: string;
    uncertaintyLabel: string | null;
  },
): OccupationDetailModel {
  const { locale, unavailable } = args;
  const reasons = occupation.exposureReasons?.length
    ? occupation.exposureReasons.slice(0, 3)
    : exposureReasonsFromRationale(occupation.exposureRationale);
  return {
    code: occupation.occupationCode,
    official: {
      employed: displayValue(occupation.employedPersons, unavailable, (value) =>
        formatNumber(Number(value), locale),
      ),
      year: displayValue(occupation.employmentDataYear, unavailable),
      outlook: occupation.laborMarketOutlook === "unavailable" ? unavailable : args.outlookLabel,
      index: displayValue(occupation.shortageSurplusIndex, unavailable),
      description: occupation.descriptionAvailable && occupation.description.trim()
        ? occupation.description
        : unavailable,
      employmentMissing: occupation.employedPersons == null,
      employmentStale: occupation.employmentStale,
      outlookMissing: occupation.laborMarketOutlook === "unavailable",
    },
    ai: {
      exposure: displayValue(occupation.theoreticalAIExposure, unavailable),
      adoption: displayValue(occupation.currentAIAdoption, unavailable),
      uncertainty: args.uncertaintyLabel ?? unavailable,
      reasons: listOrUnavailable(reasons, unavailable),
      aiTasks: listOrUnavailable(occupation.AIApplicableTasks, unavailable),
      humanTasks: listOrUnavailable(occupation.humanCriticalTasks, unavailable),
      skills: listOrUnavailable(occupation.recommendedSkills ?? [], unavailable),
      scoredAt: displayValue(occupation.scoredAt, unavailable),
      scoringModel: displayValue(occupation.scoringModel, unavailable),
      promptVersion: displayValue(occupation.promptVersion, unavailable),
      status: occupation.scoreStatus,
    },
    sources: occupation.sourceUrls,
    outlookSource: occupation.outlookSource || unavailable,
  };
}

export function exampleOccupations(occupations: Occupation[]): Occupation[] {
  const byCode = new Map(occupations.map((row) => [row.occupationCode, row]));
  return EXAMPLE_OCCUPATION_CODES.map((code) => byCode.get(code)).filter(
    (row): row is Occupation => Boolean(row),
  );
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function treemapTooltipModel(
  occupation: Occupation,
  metric: ColorMetric,
): {
  nameFi: string;
  employed: number | null;
  score: number | null;
  scoreKind: "exposure" | "adoption" | "outlook";
  uncertainty: Occupation["uncertainty"];
  rationale: string | null;
  availability: DataAvailabilityStatus;
} {
  const active = activeScore(occupation, metric);
  const rationaleSource =
    metric === "adoption" ? occupation.adoptionRationale : occupation.exposureRationale;
  return {
    nameFi: occupation.occupationNameFi,
    employed: occupation.employedPersons,
    score: active.value,
    scoreKind: active.kind,
    uncertainty: occupation.uncertainty,
    rationale: firstSentence(rationaleSource),
    availability: dataAvailabilityStatus(occupation),
  };
}

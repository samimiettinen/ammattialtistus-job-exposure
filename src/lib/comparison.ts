import { isUnclassifiedOccupation, buildOccupationDetailModel, type OccupationDetailModel } from "./occupation-view";
import type { Occupation } from "./schemas";
import { COMPARE_MAX } from "./schemas/comparison";

export function parseCompareParam(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const part of value.split(/[,+\s]+/)) {
    const code = part.trim();
    if (!code || seen.has(code)) continue;
    if (isUnclassifiedOccupation({ occupationCode: code })) continue;
    seen.add(code);
    codes.push(code);
    if (codes.length >= COMPARE_MAX) break;
  }
  return codes;
}

export function serializeCompareParam(codes: string[]): string | null {
  const unique = parseCompareParam(codes.join(","));
  return unique.length ? unique.join(",") : null;
}

export function canAddCompareCode(codes: string[], next: string): boolean {
  const parsed = parseCompareParam(next);
  if (!parsed.length) return false;
  if (codes.includes(parsed[0]!)) return true;
  return codes.length < COMPARE_MAX;
}

export function toggleCompareCode(codes: string[], next: string): string[] {
  const code = parseCompareParam(next)[0];
  if (!code) return codes;
  if (codes.includes(code)) return codes.filter((item) => item !== code);
  if (codes.length >= COMPARE_MAX) return codes;
  return [...codes, code];
}

export type ComparisonColumn = OccupationDetailModel & {
  name: string;
  present: boolean;
  scoreStatus: Occupation["scoreStatus"] | "missing";
};

export function resolveCompareOccupations(
  catalog: Occupation[],
  codes: string[],
): { requested: string[]; occupations: Occupation[]; missing: string[] } {
  const requested = parseCompareParam(codes.join(","));
  const byCode = new Map(catalog.map((row) => [row.occupationCode, row]));
  const occupations: Occupation[] = [];
  const missing: string[] = [];
  for (const code of requested) {
    const row = byCode.get(code);
    if (!row || row.level !== 4 || isUnclassifiedOccupation(row)) {
      missing.push(code);
    } else {
      occupations.push(row);
    }
  }
  return { requested, occupations, missing };
}

function emptyDetail(code: string, unavailable: string): OccupationDetailModel {
  return {
    code,
    official: {
      employed: unavailable,
      year: unavailable,
      outlook: unavailable,
      index: unavailable,
      description: unavailable,
      employmentMissing: true,
      employmentStale: false,
      outlookMissing: true,
    },
    ai: {
      exposure: unavailable,
      adoption: unavailable,
      uncertainty: unavailable,
      reasons: [unavailable],
      aiTasks: [unavailable],
      humanTasks: [unavailable],
      skills: [unavailable],
      scoredAt: unavailable,
      scoringModel: unavailable,
      promptVersion: unavailable,
      status: "unscored",
    },
    sources: [],
    outlookSource: unavailable,
  };
}

export function buildComparisonView(args: {
  catalog: Occupation[];
  codes: string[];
  locale: string;
  nameOf: (occupation: Occupation) => string;
  unavailable: string;
  outlookLabel: (outlook: Occupation["laborMarketOutlook"]) => string;
  uncertaintyLabel: (value: NonNullable<Occupation["uncertainty"]>) => string;
}): {
  requested: string[];
  missing: string[];
  columns: ComparisonColumn[];
} {
  const resolved = resolveCompareOccupations(args.catalog, args.codes);
  const byCode = new Map(resolved.occupations.map((row) => [row.occupationCode, row]));
  const columns = resolved.requested.map((code) => {
    const occupation = byCode.get(code);
    if (!occupation) {
      return {
        ...emptyDetail(code, args.unavailable),
        name: code,
        present: false,
        scoreStatus: "missing" as const,
      };
    }
    return {
      ...buildOccupationDetailModel(occupation, {
        locale: args.locale,
        unavailable: args.unavailable,
        outlookLabel:
          occupation.laborMarketOutlook === "unavailable"
            ? args.unavailable
            : args.outlookLabel(occupation.laborMarketOutlook),
        uncertaintyLabel: occupation.uncertainty ? args.uncertaintyLabel(occupation.uncertainty) : null,
      }),
      name: args.nameOf(occupation),
      present: true,
      scoreStatus: occupation.scoreStatus,
    };
  });
  return { requested: resolved.requested, missing: resolved.missing, columns };
}

export type ComparisonExportRow = { key: string; label: string; values: string[] };

export function comparisonExportRows(
  columns: ComparisonColumn[],
  labels: {
    employed: string;
    year: string;
    outlook: string;
    exposure: string;
    adoption: string;
    uncertainty: string;
    reasons: string;
    ai: string;
    human: string;
    skills: string;
    sources: string;
  },
): ComparisonExportRow[] {
  const join = (items: string[]) => items.join(" · ");
  return [
    { key: "employed", label: labels.employed, values: columns.map((col) => col.official.employed) },
    { key: "year", label: labels.year, values: columns.map((col) => col.official.year) },
    { key: "outlook", label: labels.outlook, values: columns.map((col) => col.official.outlook) },
    { key: "exposure", label: labels.exposure, values: columns.map((col) => col.ai.exposure) },
    { key: "adoption", label: labels.adoption, values: columns.map((col) => col.ai.adoption) },
    { key: "uncertainty", label: labels.uncertainty, values: columns.map((col) => col.ai.uncertainty) },
    { key: "reasons", label: labels.reasons, values: columns.map((col) => join(col.ai.reasons)) },
    { key: "ai", label: labels.ai, values: columns.map((col) => join(col.ai.aiTasks)) },
    { key: "human", label: labels.human, values: columns.map((col) => join(col.ai.humanTasks)) },
    { key: "skills", label: labels.skills, values: columns.map((col) => join(col.ai.skills)) },
    {
      key: "sources",
      label: labels.sources,
      values: columns.map((col) => (col.sources.length ? col.sources.join(" · ") : col.outlookSource)),
    },
  ];
}

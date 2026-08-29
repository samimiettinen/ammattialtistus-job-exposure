import { isUnclassifiedOccupation } from "../occupation-view";
import type { Occupation } from "../schemas";
import { type workdayMatchSchema } from "../schemas/workday";
import type { z } from "zod";

type WorkdayMatch = z.infer<typeof workdayMatchSchema>;

const STOP = new Set([
  "ja",
  "tai",
  "on",
  "ei",
  "ole",
  "seka",
  "sekä",
  "etta",
  "että",
  "the",
  "and",
  "or",
  "for",
  "with",
  "att",
  "och",
  "som",
  "för",
  "med",
  "en",
  "ett",
  "tyota",
  "työtä",
  "work",
  "job",
]);

export const MATCH_AUTO_MIN = 0.55;
export const MATCH_GAP = 0.15;
export const MATCH_NONE = 0.32;

export function normalizeWorkdayText(value: string): string {
  return value.toLocaleLowerCase("fi").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function workdayTokens(value: string): string[] {
  return normalizeWorkdayText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP.has(token));
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const left = new Set(a);
  const right = new Set(b);
  let inter = 0;
  for (const item of left) if (right.has(item)) inter += 1;
  return inter / new Set([...left, ...right]).size;
}

function stemOverlap(query: string, corpus: string): number {
  const tokens = workdayTokens(query);
  if (!tokens.length) return 0;
  const hay = normalizeWorkdayText(corpus);
  let hits = 0;
  for (const token of tokens) {
    const stem = token.slice(0, Math.min(5, token.length));
    if (stem.length >= 4 && hay.includes(stem)) hits += 1;
  }
  return hits / tokens.length;
}

export function scoreOccupationMatch(
  occupation: Occupation,
  query: { jobTitle?: string; workdayText?: string },
): number {
  const title = normalizeWorkdayText(query.jobTitle ?? "");
  const names = [
    occupation.occupationNameFi,
    occupation.occupationNameSv,
    occupation.occupationNameEn,
    occupation.occupationCode,
  ].map(normalizeWorkdayText);

  if (title && (title === occupation.occupationCode.toLocaleLowerCase("fi") || names.includes(title))) {
    return title === occupation.occupationCode.toLocaleLowerCase("fi") ? 1 : 0.98;
  }
  if (title && names.some((name) => name.includes(title) || title.includes(name))) {
    return 0.84;
  }

  const corpus = [
    occupation.occupationNameFi,
    occupation.occupationNameSv,
    occupation.occupationNameEn,
    occupation.description,
    ...occupation.AIApplicableTasks,
    ...occupation.humanCriticalTasks,
  ].join(" ");
  const titleScore = Math.max(
    jaccard(workdayTokens(query.jobTitle ?? ""), workdayTokens(names.join(" "))),
    stemOverlap(query.jobTitle ?? "", names.join(" ")),
  );
  const workScore = Math.max(
    jaccard(workdayTokens(query.workdayText ?? "").slice(0, 48), workdayTokens(corpus)),
    stemOverlap(query.workdayText ?? "", corpus),
  );
  return Math.min(1, 0.12 + 0.63 * titleScore + 0.25 * workScore);
}

export function comparableOccupations(catalog: Occupation[]): Occupation[] {
  return catalog.filter((row) => row.level === 4 && !isUnclassifiedOccupation(row));
}

export function matchOccupations(
  catalog: Occupation[],
  query: { jobTitle?: string; workdayText?: string; occupationCode?: string },
): {
  status: "selected" | "ambiguous" | "no_match";
  selected: Occupation | null;
  matches: WorkdayMatch[];
} {
  const pool = comparableOccupations(catalog);
  if (query.occupationCode) {
    const exact =
      pool.find((row) => row.occupationCode === query.occupationCode) ??
      catalog.find(
        (row) => row.occupationCode === query.occupationCode && !isUnclassifiedOccupation(row),
      );
    if (exact) {
      return { status: "selected", selected: exact, matches: [toMatch(exact, 1)] };
    }
  }

  const ranked = pool
    .map((occupation) => ({ occupation, confidence: scoreOccupationMatch(occupation, query) }))
    .sort((a, b) => b.confidence - a.confidence);
  const top = ranked.slice(0, 3).filter((row) => row.confidence >= MATCH_NONE);
  if (!top.length) {
    return { status: "no_match", selected: null, matches: [] };
  }

  const best = top[0]!;
  const second = top[1];
  const ambiguous = Boolean(
    second && (best.confidence < MATCH_AUTO_MIN || best.confidence - second.confidence < MATCH_GAP),
  );
  if (ambiguous || best.confidence < MATCH_AUTO_MIN) {
    return {
      status: "ambiguous",
      selected: null,
      matches: top.map((row) => toMatch(row.occupation, row.confidence)),
    };
  }
  return {
    status: "selected",
    selected: best.occupation,
    matches: top.map((row) => toMatch(row.occupation, row.confidence)),
  };
}

function toMatch(occupation: Occupation, confidence: number): WorkdayMatch {
  return {
    occupationCode: occupation.occupationCode,
    occupationNameFi: occupation.occupationNameFi,
    occupationNameSv: occupation.occupationNameSv,
    occupationNameEn: occupation.occupationNameEn,
    confidence: Number(confidence.toFixed(3)),
    level: occupation.level,
  };
}

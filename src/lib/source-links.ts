import { evidenceKindForUrl } from "./occupation-analysis";
import type { EvidenceItem, Occupation } from "./schemas";

/**
 * Labelled links to the official sources behind an occupation record.
 *
 * Only URLs already recorded on the record are surfaced. No per-occupation deep
 * link is constructed: no such URL has been verified against the live services
 * (see docs/SOURCE_DATA_MAPPING.md), and guessing one would fabricate a
 * citation. An unrecognised URL keeps its host as the label rather than being
 * given a description it has not earned.
 *
 * This module is imported by a client component, so it must not pull in
 * anything from `pipeline/paths.ts` (which uses `node:path`). The label table
 * mirrors `SOURCE_URLS`; `tests/source-links.test.ts` fails if the two drift.
 */

export const SOURCE_LABEL_KEYS = [
  "classificationApi",
  "classificationPage",
  "employmentTable",
  "employmentDocs",
  "barometerCatalog",
  "barometerSite",
] as const;

export type SourceLabelKey = (typeof SOURCE_LABEL_KEYS)[number];

/** Most specific first; `tyovoimabarometri.fi` is the catch-all for that host. */
const LABEL_MATCHERS: Array<{ match: string; key: SourceLabelKey }> = [
  { match: "data.stat.fi/api/classifications", key: "classificationApi" },
  { match: "pxdata.stat.fi/PxWeb/api/v1/fi/StatFin/tyokay/115r.px", key: "employmentTable" },
  { match: "stat.fi/tilasto/dokumentaatio/tyokay", key: "employmentDocs" },
  { match: "stat.fi/en/luokitukset/ammatti", key: "classificationPage" },
  { match: "tyovoimabarometri.fi/api/ammatit", key: "barometerCatalog" },
  { match: "tyovoimabarometri.fi", key: "barometerSite" },
];

export type SourceLink = {
  url: string;
  kind: EvidenceItem["kind"];
  labelKey: SourceLabelKey | null;
  host: string;
};

export function sourceLabelKey(url: string): SourceLabelKey | null {
  return LABEL_MATCHERS.find((entry) => url.includes(entry.match))?.key ?? null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildSourceLinks(
  occupation: Pick<Occupation, "sourceUrls" | "evidence">,
): SourceLink[] {
  const kindByUrl = new Map((occupation.evidence ?? []).map((item) => [item.url, item.kind]));
  const seen = new Set<string>();
  const links: SourceLink[] = [];

  for (const url of occupation.sourceUrls ?? []) {
    if (!isHttpUrl(url) || seen.has(url)) continue;
    seen.add(url);
    links.push({
      url,
      kind: kindByUrl.get(url) ?? evidenceKindForUrl(url),
      labelKey: sourceLabelKey(url),
      host: hostOf(url),
    });
  }
  return links;
}

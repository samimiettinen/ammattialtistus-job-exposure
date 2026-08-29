import { exposureReasonsFromRationale } from "./occupation-view";
import { occupationSchema, type EvidenceItem, type Occupation } from "./schemas";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function evidenceKindForUrl(url: string): EvidenceItem["kind"] {
  if (
    url.includes("pxdata.stat.fi") ||
    url.includes("tyovoimabarometri.fi") ||
    url.includes("stat.fi/tilasto")
  ) {
    return "official";
  }
  return "classification";
}

export function evidenceFromSourceUrls(urls: string[]): EvidenceItem[] {
  return urls.filter(isHttpUrl).map((url) => ({
    url,
    kind: evidenceKindForUrl(url),
  }));
}

export function deriveExposureReasons(occupation: Pick<Occupation, "exposureReasons" | "exposureRationale">): string[] {
  if (occupation.exposureReasons?.length) return occupation.exposureReasons.slice(0, 3);
  return exposureReasonsFromRationale(occupation.exposureRationale);
}

export function enrichOccupationAnalysis(occupation: Occupation): Occupation {
  return occupationSchema.parse({
    ...occupation,
    exposureReasons: deriveExposureReasons(occupation),
    evidence: occupation.evidence?.length ? occupation.evidence : evidenceFromSourceUrls(occupation.sourceUrls),
    exposureRangeLow: occupation.exposureRangeLow ?? null,
    exposureRangeHigh: occupation.exposureRangeHigh ?? null,
    recommendedSkills: occupation.recommendedSkills ?? [],
  });
}

export function occupationCacheKey(parts: {
  occupationCode: string;
  promptVersion: string;
  sourceDataHash: string;
  scoringModel: string;
}): string {
  return [parts.occupationCode, parts.sourceDataHash, parts.promptVersion, parts.scoringModel].join("::");
}

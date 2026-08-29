import {
  classificationItemSchema,
  type ClassificationItem,
  type ParsedOccupation,
} from "../schemas";
import { CLASSIFICATION_ITEMS_URL, SOURCE_URLS } from "./paths";

export function nameOf(item: ClassificationItem): string {
  return item.classificationItemNames[0]?.name ?? item.code;
}

export function extractDescription(item: ClassificationItem): { text: string; available: boolean } {
  const notes = item.explanatoryNotes ?? [];
  const parts: string[] = [];
  for (const note of notes) {
    const general = note.generalNote?.find((value) => value.trim().length > 0);
    if (general) parts.push(general.replace(/\r\n/g, "\n").trim());
  }
  const text = parts[0] ?? "";
  return { text, available: text.length > 0 };
}

export function parseClassificationBundle(args: {
  fi: unknown;
  sv: unknown;
  en: unknown;
}): ParsedOccupation[] {
  const fi = classificationItemSchema.array().parse(args.fi);
  const svByCode = new Map(
    classificationItemSchema.array().parse(args.sv).map((item) => [item.code, nameOf(item)]),
  );
  const enByCode = new Map(
    classificationItemSchema.array().parse(args.en).map((item) => [item.code, nameOf(item)]),
  );

  const byCode = new Map(fi.map((item) => [item.code, item]));
  const majorNames = new Map(
    fi.filter((item) => item.level === 1).map((item) => [item.code, nameOf(item)]),
  );

  const parsed: ParsedOccupation[] = [];
  for (const item of fi) {
    const level = Math.round(item.level);
    if (level < 1 || level > 5) continue;
    if (item.code.includes(".")) continue;

    const majorGroupCode = majorGroupOf(item.code);
    const majorGroupName = majorNames.get(majorGroupCode);
    if (!majorGroupName) continue;

    const fiName = nameOf(item);
    const svName = svByCode.get(item.code);
    const enName = enByCode.get(item.code);
    const { text, available } = extractDescription(item);

    parsed.push({
      occupationCode: item.code,
      level,
      parentCode: item.parentCode ?? null,
      majorGroupCode,
      majorGroupName,
      occupationNameFi: fiName,
      occupationNameSv: svName ?? fiName,
      occupationNameEn: enName ?? fiName,
      nameFallbackSv: !svName,
      nameFallbackEn: !enName,
      description: text,
      descriptionAvailable: available,
      sourceUrls: [...SOURCE_URLS],
    });
  }

  void byCode;
  return parsed;
}

export function majorGroupOf(code: string): string {
  if (code.startsWith("X")) return "X";
  return code.charAt(0);
}

export function classificationItemsUrl(lang: "fi" | "sv" | "en"): string {
  return `${CLASSIFICATION_ITEMS_URL}?content=data&meta=max&lang=${lang}`;
}

import { z } from "zod";

export const classificationItemNameSchema = z.object({
  langName: z.string().optional(),
  lang: z.string(),
  name: z.string(),
});

export const explanatoryNoteSchema = z
  .object({
    type: z.array(z.string()).optional(),
    langName: z.array(z.string()).optional(),
    lang: z.array(z.string()).optional(),
    generalNote: z.array(z.string()).optional(),
    includes: z.array(z.string()).optional(),
    includesAlso: z.array(z.string()).optional(),
    excludes: z.array(z.string()).optional(),
  })
  .passthrough();

export const classificationItemSchema = z
  .object({
    localId: z.string(),
    level: z.number(),
    code: z.string(),
    order: z.number().optional(),
    parentItemLocalId: z.string().nullable().optional(),
    parentCode: z.string().nullable().optional(),
    classificationItemNames: z.array(classificationItemNameSchema),
    explanatoryNotes: z.array(explanatoryNoteSchema).optional(),
  })
  .passthrough();

export type ClassificationItem = z.infer<typeof classificationItemSchema>;

export const parsedOccupationSchema = z.object({
  occupationCode: z.string(),
  level: z.number().int(),
  parentCode: z.string().nullable(),
  majorGroupCode: z.string(),
  majorGroupName: z.string(),
  occupationNameFi: z.string(),
  occupationNameSv: z.string(),
  occupationNameEn: z.string(),
  nameFallbackSv: z.boolean(),
  nameFallbackEn: z.boolean(),
  description: z.string(),
  descriptionAvailable: z.boolean(),
  sourceUrls: z.array(z.string()),
});

export type ParsedOccupation = z.infer<typeof parsedOccupationSchema>;

export const employmentRowSchema = z.object({
  occupationCode: z.string(),
  label: z.string(),
  employedPersons: z.number().int().nonnegative(),
  year: z.number().int(),
  isResidualPxCode: z.boolean(),
});

export type EmploymentRow = z.infer<typeof employmentRowSchema>;

/** `GET /api/Paikka/regions` — 19 maakunnat. `id` joins to kohtaanto `groupingId`. */
export const barometerRegionSchema = z
  .object({
    id: z.string(),
    koodi: z.string().optional(),
    nimi: z.string().optional(),
    voimassaAlkaen: z.string().nullable().optional(),
    voimassaPaattyen: z.string().nullable().optional(),
  })
  .passthrough();

export type BarometerRegion = z.infer<typeof barometerRegionSchema>;

export const kohtaantoTilaSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(99),
]);

export const barometerOccupationSchema = z
  .object({
    nimi: z.string(),
    id: z.string(),
    toimialaId: z.string().nullable().optional(),
    koodi: z.string(),
    kaytossa: z.boolean().optional(),
    uiNayttaa: z.boolean().optional(),
    lokalisoidutNimet: z.unknown().optional(),
    tyopaikkaKerroin: z.unknown().optional(),
  })
  .passthrough();

export type BarometerOccupation = z.infer<typeof barometerOccupationSchema>;

export const kohtaantoRowSchema = z
  .object({
    groupingId: z.string(),
    asteikko: z.number().nullable().optional(),
    kulmakerroin: z.number().nullable().optional(),
    tyottomyysaste: z.number().nullable().optional(),
    vakanssiaste: z.number().nullable().optional(),
    kohtaantotila: z.number(),
    kohtaantoaste: z.number().nullable().optional(),
    tyottomat: z.number().nullable().optional(),
    tyottomatSensuroitu: z.boolean().optional(),
    toissa: z.number().nullable().optional(),
    toissaSensuroitu: z.boolean().optional(),
    tyopaikat: z.number().nullable().optional(),
    kohtaantoTime: z.string().optional(),
  })
  .passthrough();

export type KohtaantoRow = z.infer<typeof kohtaantoRowSchema>;

export const outlookRecordSchema = z.object({
  occupationCode: z.string(),
  barometerId: z.string(),
  barometerName: z.string(),
  period: z.string(),
  laborMarketOutlook: z.enum([
    "shortage",
    "surplus",
    "balanced",
    "mismatch",
    "unavailable",
  ]),
  shortageSurplusIndex: z.number().nullable(),
  outlookSource: z.string(),
  outlookStale: z.boolean(),
  regionCount: z.number().int(),
  usableRegionCount: z.number().int(),
  regional: z.array(kohtaantoRowSchema),
});

export type OutlookRecord = z.infer<typeof outlookRecordSchema>;

import {
  barometerOccupationSchema,
  barometerRegionSchema,
  kohtaantoRowSchema,
  regionalOutlookSchema,
  type BarometerOccupation,
  type BarometerRegion,
  type KohtaantoRow,
  type LaborMarketOutlook,
  type OutlookRecord,
  type RegionalOutlook,
} from "../schemas";
import { RETRIEVED_AT } from "./paths";

const TILA_TO_OUTLOOK: Record<number, LaborMarketOutlook | null> = {
  0: "balanced",
  1: "surplus",
  2: "mismatch",
  3: "shortage",
  99: null,
};

export function outlookFromKohtaantotila(tila: number): LaborMarketOutlook {
  return TILA_TO_OUTLOOK[tila] ?? "unavailable";
}

/** kohtaantoaste is a 1–5 severity grade in the barometer UI. Anything else is dropped. */
function matchingDegree(value: number | null | undefined): number | null {
  if (value == null || !Number.isInteger(value) || value < 1 || value > 5) return null;
  return value;
}

/** A censored count is stored as null, never as a value and never as a zero. */
function censoredCount(value: number | null | undefined, censored: boolean): number | null {
  if (censored) return null;
  if (value == null || Number.isNaN(value) || value < 0) return null;
  return value;
}

export function parseBarometerRegions(payload: unknown): BarometerRegion[] {
  return barometerRegionSchema.array().parse(payload);
}

/**
 * Turn raw kohtaanto rows into the region-named shape the occupation record
 * carries. Region names are looked up by `groupingId`; an unresolved id keeps a
 * null name instead of inventing one.
 */
export function toRegionalOutlook(
  rows: KohtaantoRow[],
  regions: BarometerRegion[] = [],
): RegionalOutlook[] {
  const byId = new Map(regions.map((region) => [region.id, region]));
  return rows.map((row) => {
    const region = byId.get(row.groupingId);
    const employedCensored = Boolean(row.toissaSensuroitu);
    const unemployedCensored = Boolean(row.tyottomatSensuroitu);
    return regionalOutlookSchema.parse({
      regionId: row.groupingId,
      regionCode: region?.koodi ?? null,
      regionName: region?.nimi ?? null,
      laborMarketOutlook: outlookFromKohtaantotila(row.kohtaantotila),
      matchingState: row.kohtaantotila,
      matchingDegree: matchingDegree(row.kohtaantoaste),
      employedPersons: censoredCount(row.toissa, employedCensored),
      employedCensored,
      unemployedJobseekers: censoredCount(row.tyottomat, unemployedCensored),
      unemployedCensored,
      vacancies: censoredCount(row.tyopaikat, false),
      period: row.kohtaantoTime ?? null,
    });
  });
}

export function signedKohtaantoAste(row: KohtaantoRow): number | null {
  if (row.kohtaantotila === 99) return null;
  const aste = row.kohtaantoaste;
  if (aste == null || Number.isNaN(aste)) return null;
  if (row.kohtaantotila === 3) return aste;
  if (row.kohtaantotila === 1) return -aste;
  return 0;
}

export function usableWeight(row: KohtaantoRow): number | null {
  if (row.toissaSensuroitu) return null;
  if (row.kohtaantotila === 99) return null;
  if (row.toissa == null || Number.isNaN(row.toissa) || row.toissa < 0) return null;
  return row.toissa;
}

export function aggregateNationalOutlook(args: {
  occupationCode: string;
  barometer: BarometerOccupation;
  period: string;
  regional: KohtaantoRow[];
}): OutlookRecord {
  const usable = args.regional.filter((row) => usableWeight(row) != null);
  const totalWeight = usable.reduce((sum, row) => sum + (usableWeight(row) ?? 0), 0);

  let laborMarketOutlook: LaborMarketOutlook = "unavailable";
  let shortageSurplusIndex: number | null = null;

  if (totalWeight > 0) {
    const votes = new Map<LaborMarketOutlook, number>();
    let signedSum = 0;
    let signedWeight = 0;
    for (const row of usable) {
      const weight = usableWeight(row) ?? 0;
      const outlook = TILA_TO_OUTLOOK[row.kohtaantotila];
      if (outlook) {
        votes.set(outlook, (votes.get(outlook) ?? 0) + weight);
      }
      const signed = signedKohtaantoAste(row);
      if (signed != null) {
        signedSum += signed * weight;
        signedWeight += weight;
      }
    }
    const ranked = [...votes.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked[0]) laborMarketOutlook = ranked[0][0];
    if (signedWeight > 0) {
      shortageSurplusIndex = Math.round((signedSum / signedWeight) * 100) / 100;
    }
  }

  const period = args.regional[0]?.kohtaantoTime ?? args.period;
  const outlookStale = isOutlookStale(period, RETRIEVED_AT);

  return {
    occupationCode: args.occupationCode,
    barometerId: args.barometer.id,
    barometerName: args.barometer.nimi,
    period,
    laborMarketOutlook,
    shortageSurplusIndex,
    outlookSource: `Työvoimabarometri kohtaanto (KEHA), aluehavainnot ${period}, kansallinen työllispainotettu kooste; ei virallinen valtakunnallinen indeksi. Haettu ${RETRIEVED_AT}.`,
    outlookStale,
    regionCount: args.regional.length,
    usableRegionCount: usable.length,
    regional: args.regional,
  };
}

export function isOutlookStale(period: string, retrievedAt: string): boolean {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return true;
  const observed = new Date(Date.UTC(year, month - 1, 1));
  const retrieved = new Date(`${retrievedAt}T00:00:00Z`);
  const limit = new Date(retrieved);
  limit.setUTCMonth(limit.getUTCMonth() - 6);
  return observed < limit;
}

export function parseBarometerCatalog(payload: unknown): BarometerOccupation[] {
  return barometerOccupationSchema.array().parse(payload);
}

export function parseKohtaantoRows(payload: unknown): KohtaantoRow[] {
  return kohtaantoRowSchema.array().parse(payload);
}

import { scoreBand, type ScoreBand } from "./occupation-view";
import type {
  BandBucket,
  CompositionMetric,
  CoverageStrip,
  CrossTabCell,
  LaborMarketOutlook,
  MarketComposition,
  Occupation,
  OutlookBucket,
} from "./schemas";

/** Numeric range shown for each band. Locale-independent. */
export const BAND_RANGE_LABEL: Record<ScoreBand, string> = {
  "910": "9\u201310",
  "78": "7\u20138",
  "56": "5\u20136",
  "34": "3\u20134",
  "12": "1\u20132",
  "0": "0",
};

/** High band first, so the histogram reads top-down from most exposed. */
export const BAND_ORDER: ScoreBand[] = ["910", "78", "56", "34", "12", "0"];

/** Official categories in shortage → surplus order, with the unavailable class kept visible. */
export const OUTLOOK_ORDER: LaborMarketOutlook[] = [
  "shortage",
  "mismatch",
  "balanced",
  "surplus",
  "unavailable",
];

export function metricValue(occupation: Occupation, metric: CompositionMetric): number | null {
  return metric === "adoption" ? occupation.currentAIAdoption : occupation.theoreticalAIExposure;
}

function employed(occupation: Occupation): number {
  return occupation.employedPersons ?? 0;
}

function share(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return part / whole;
}

/**
 * Employment-weighted mean of an AI score.
 *
 * Rows without an employment figure carry no weight. When nothing carries
 * weight the result is null, which the UI renders as unavailable — never 0.
 */
export function weightedMean(
  occupations: Occupation[],
  metric: CompositionMetric,
): { mean: number | null; weight: number } {
  let sum = 0;
  let weight = 0;
  for (const row of occupations) {
    const value = metricValue(row, metric);
    const employedPersons = employed(row);
    if (value == null || employedPersons <= 0) continue;
    sum += value * employedPersons;
    weight += employedPersons;
  }
  return { mean: weight > 0 ? sum / weight : null, weight };
}

export function scoredRows(occupations: Occupation[], metric: CompositionMetric): Occupation[] {
  return occupations.filter((row) => metricValue(row, metric) != null);
}

export function buildCoverageStrip(
  occupations: Occupation[],
  metric: CompositionMetric,
): CoverageStrip {
  const scored = scoredRows(occupations, metric);
  const employedTotal = occupations.reduce((sum, row) => sum + employed(row), 0);
  const employedScored = scored.reduce((sum, row) => sum + employed(row), 0);

  return {
    occupationCount: occupations.length,
    scoredCount: scored.length,
    fixtureCount: scored.filter((row) => row.scoreStatus === "fixture").length,
    llmCount: scored.filter((row) => row.scoreStatus === "llm").length,
    unscoredCount: occupations.length - scored.length,
    rowShare: occupations.length ? scored.length / occupations.length : null,
    employedTotal,
    employedScored,
    employedShare: share(employedScored, employedTotal),
    missingEmploymentCount: occupations.filter((row) => row.employedPersons == null).length,
    scoredMissingEmploymentCount: scored.filter((row) => row.employedPersons == null).length,
  };
}

/**
 * Employment by score band across the scored subset only.
 *
 * All six bands are emitted when at least one row is scored, so an empty band
 * is a real zero within that subset. With nothing scored the list is empty and
 * the UI shows the unavailable label instead of a flat histogram.
 */
export function buildBandBuckets(
  occupations: Occupation[],
  metric: CompositionMetric,
): BandBucket[] {
  const scored = scoredRows(occupations, metric);
  if (scored.length === 0) return [];

  const scoredEmployment = scored.reduce((sum, row) => sum + employed(row), 0);
  const counts = new Map<ScoreBand, { occupationCount: number; employedPersons: number }>();
  for (const band of BAND_ORDER) counts.set(band, { occupationCount: 0, employedPersons: 0 });

  for (const row of scored) {
    const value = metricValue(row, metric);
    if (value == null) continue;
    const bucket = counts.get(scoreBand(value));
    if (!bucket) continue;
    bucket.occupationCount += 1;
    bucket.employedPersons += employed(row);
  }

  return BAND_ORDER.map((band) => {
    const bucket = counts.get(band) ?? { occupationCount: 0, employedPersons: 0 };
    return {
      band,
      occupationCount: bucket.occupationCount,
      employedPersons: bucket.employedPersons,
      share: share(bucket.employedPersons, scoredEmployment),
    };
  });
}

/** Official mix over every row in view. Needs no AI score. */
export function buildOutlookBuckets(occupations: Occupation[]): OutlookBucket[] {
  const employedTotal = occupations.reduce((sum, row) => sum + employed(row), 0);
  return OUTLOOK_ORDER.map((outlook) => {
    const rows = occupations.filter((row) => row.laborMarketOutlook === outlook);
    const employedPersons = rows.reduce((sum, row) => sum + employed(row), 0);
    return {
      outlook,
      occupationCount: rows.length,
      employedPersons,
      share: share(employedPersons, employedTotal),
    };
  });
}

function crossTabCell(
  key: string,
  fallbackLabel: string,
  rows: Occupation[],
  metric: CompositionMetric,
): CrossTabCell {
  const scored = scoredRows(rows, metric);
  const { mean } = weightedMean(scored, metric);
  return {
    key,
    fallbackLabel,
    occupationCount: rows.length,
    scoredCount: scored.length,
    employedPersons: scored.reduce((sum, row) => sum + employed(row), 0),
    weightedMean: mean,
  };
}

/**
 * AI metric against the official outlook class. Cells with no scored row keep a
 * null mean; the count next to it shows the reader why.
 */
export function buildCrossOutlook(
  occupations: Occupation[],
  metric: CompositionMetric,
): CrossTabCell[] {
  return OUTLOOK_ORDER.map((outlook) =>
    crossTabCell(
      outlook,
      outlook,
      occupations.filter((row) => row.laborMarketOutlook === outlook),
      metric,
    ),
  );
}

/** AI metric against the AML 2010 major group, in classification order. */
export function buildCrossMajorGroup(
  occupations: Occupation[],
  metric: CompositionMetric,
): CrossTabCell[] {
  const groups = new Map<string, Occupation[]>();
  for (const row of occupations) {
    const list = groups.get(row.majorGroupCode) ?? [];
    list.push(row);
    groups.set(row.majorGroupCode, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, rows]) => crossTabCell(code, rows[0]?.majorGroupName ?? code, rows, metric));
}

export function buildMarketComposition(
  occupations: Occupation[],
  metric: CompositionMetric,
): MarketComposition {
  const scored = scoredRows(occupations, metric);
  const { mean, weight } = weightedMean(scored, metric);
  const employmentYears = [
    ...new Set(
      occupations
        .map((row) => row.employmentDataYear)
        .filter((year): year is number => year != null),
    ),
  ].sort((a, b) => a - b);

  return {
    metric,
    coverage: buildCoverageStrip(occupations, metric),
    official: {
      outlook: buildOutlookBuckets(occupations),
      employedTotal: occupations.reduce((sum, row) => sum + employed(row), 0),
      missingEmploymentCount: occupations.filter((row) => row.employedPersons == null).length,
      staleEmploymentCount: occupations.filter((row) => row.employmentStale).length,
      employmentYears,
    },
    ai: {
      weightedMean: mean,
      weight,
      bands: buildBandBuckets(occupations, metric),
    },
    crossOutlook: buildCrossOutlook(occupations, metric),
    crossMajorGroup: buildCrossMajorGroup(occupations, metric),
  };
}

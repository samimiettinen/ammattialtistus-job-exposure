import { z } from "zod";
import { laborMarketOutlookSchema } from "./occupation";

/**
 * Filter-aware market composition.
 *
 * Two denominators exist and they are never mixed:
 *  - official blocks are computed over every row in view;
 *  - AI blocks are computed over the scored rows only, and the coverage strip
 *    states how small that subset is before any mean is shown.
 */

export const compositionMetricSchema = z.enum(["exposure", "adoption"]);
export type CompositionMetric = z.infer<typeof compositionMetricSchema>;

export const scoreBandSchema = z.enum(["910", "78", "56", "34", "12", "0"]);

export const coverageStripSchema = z.object({
  occupationCount: z.number().int().nonnegative(),
  scoredCount: z.number().int().nonnegative(),
  fixtureCount: z.number().int().nonnegative(),
  llmCount: z.number().int().nonnegative(),
  unscoredCount: z.number().int().nonnegative(),
  /** scoredCount / occupationCount, null when the view is empty. */
  rowShare: z.number().min(0).max(1).nullable(),
  employedTotal: z.number().nonnegative(),
  employedScored: z.number().nonnegative(),
  /** employedScored / employedTotal, null when no employment figure is in view. */
  employedShare: z.number().min(0).max(1).nullable(),
  missingEmploymentCount: z.number().int().nonnegative(),
  scoredMissingEmploymentCount: z.number().int().nonnegative(),
});
export type CoverageStrip = z.infer<typeof coverageStripSchema>;

export const bandBucketSchema = z.object({
  band: scoreBandSchema,
  occupationCount: z.number().int().nonnegative(),
  employedPersons: z.number().nonnegative(),
  /** Share of employment in the scored subset, null when that subset carries no employment. */
  share: z.number().min(0).max(1).nullable(),
});
export type BandBucket = z.infer<typeof bandBucketSchema>;

export const outlookBucketSchema = z.object({
  outlook: laborMarketOutlookSchema,
  occupationCount: z.number().int().nonnegative(),
  employedPersons: z.number().nonnegative(),
  /** Share of employment in view, null when no row in view has an employment figure. */
  share: z.number().min(0).max(1).nullable(),
});
export type OutlookBucket = z.infer<typeof outlookBucketSchema>;

export const crossTabCellSchema = z.object({
  key: z.string(),
  /** Finnish classification label as it stands in the catalog; the UI localises level-1 names. */
  fallbackLabel: z.string(),
  occupationCount: z.number().int().nonnegative(),
  scoredCount: z.number().int().nonnegative(),
  employedPersons: z.number().nonnegative(),
  /** Employment-weighted mean of the active AI metric, null when no scored row carries weight. */
  weightedMean: z.number().min(0).max(10).nullable(),
});
export type CrossTabCell = z.infer<typeof crossTabCellSchema>;

export const marketCompositionSchema = z.object({
  metric: compositionMetricSchema,
  coverage: coverageStripSchema,
  official: z.object({
    outlook: z.array(outlookBucketSchema),
    employedTotal: z.number().nonnegative(),
    missingEmploymentCount: z.number().int().nonnegative(),
    staleEmploymentCount: z.number().int().nonnegative(),
    employmentYears: z.array(z.number().int()),
  }),
  ai: z.object({
    weightedMean: z.number().min(0).max(10).nullable(),
    weight: z.number().nonnegative(),
    bands: z.array(bandBucketSchema),
  }),
  crossOutlook: z.array(crossTabCellSchema),
  crossMajorGroup: z.array(crossTabCellSchema),
});
export type MarketComposition = z.infer<typeof marketCompositionSchema>;

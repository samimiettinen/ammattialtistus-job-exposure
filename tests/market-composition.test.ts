import { describe, expect, it } from "vitest";
import { visualOccupations } from "../src/lib/catalog";
import {
  BAND_ORDER,
  buildBandBuckets,
  buildCoverageStrip,
  buildCrossMajorGroup,
  buildCrossOutlook,
  buildMarketComposition,
  buildOutlookBuckets,
  weightedMean,
} from "../src/lib/market-composition";
import { marketCompositionSchema } from "../src/lib/schemas";
import { testOccupation } from "./helpers";

const unscored = { theoreticalAIExposure: null, currentAIAdoption: null, scoreStatus: "unscored" as const };

describe("coverage strip", () => {
  it("reports the scored subset against both denominators", () => {
    const coverage = buildCoverageStrip(
      [
        testOccupation("2512", { employedPersons: 30000, theoreticalAIExposure: 9 }),
        testOccupation("7111", { employedPersons: 70000, ...unscored }),
        testOccupation("5321", { employedPersons: 100000, ...unscored }),
      ],
      "exposure",
    );
    expect(coverage.occupationCount).toBe(3);
    expect(coverage.scoredCount).toBe(1);
    expect(coverage.unscoredCount).toBe(2);
    expect(coverage.rowShare).toBeCloseTo(1 / 3);
    expect(coverage.employedTotal).toBe(200000);
    expect(coverage.employedScored).toBe(30000);
    expect(coverage.employedShare).toBeCloseTo(0.15);
  });

  it("counts scored rows that carry no employment weight", () => {
    const coverage = buildCoverageStrip(
      [
        testOccupation("2512", { employedPersons: null, employmentDataYear: null, theoreticalAIExposure: 9 }),
        testOccupation("7111", { employedPersons: 100, theoreticalAIExposure: 2 }),
      ],
      "exposure",
    );
    expect(coverage.scoredCount).toBe(2);
    expect(coverage.scoredMissingEmploymentCount).toBe(1);
    expect(coverage.missingEmploymentCount).toBe(1);
    expect(coverage.employedScored).toBe(100);
  });

  it("has no share to report when the view is empty", () => {
    const coverage = buildCoverageStrip([], "exposure");
    expect(coverage.rowShare).toBeNull();
    expect(coverage.employedShare).toBeNull();
  });

  it("tracks coverage per metric, not once for the row", () => {
    const rows = [testOccupation("2512", { employedPersons: 100, currentAIAdoption: null })];
    expect(buildCoverageStrip(rows, "exposure").scoredCount).toBe(1);
    expect(buildCoverageStrip(rows, "adoption").scoredCount).toBe(0);
  });
});

describe("weighted mean", () => {
  it("weights by employed persons", () => {
    const mean = weightedMean(
      [
        testOccupation("2512", { employedPersons: 300, theoreticalAIExposure: 10 }),
        testOccupation("7111", { employedPersons: 100, theoreticalAIExposure: 2 }),
      ],
      "exposure",
    );
    expect(mean.mean).toBeCloseTo(8);
    expect(mean.weight).toBe(400);
  });

  it("gives no weight to rows without an employment figure", () => {
    const mean = weightedMean(
      [
        testOccupation("2512", { employedPersons: null, employmentDataYear: null, theoreticalAIExposure: 10 }),
        testOccupation("7111", { employedPersons: 100, theoreticalAIExposure: 2 }),
      ],
      "exposure",
    );
    expect(mean.mean).toBe(2);
    expect(mean.weight).toBe(100);
  });

  it("returns null rather than zero when nothing carries weight", () => {
    const mean = weightedMean([testOccupation("2512", { employedPersons: 100, ...unscored })], "exposure");
    expect(mean.mean).toBeNull();
    expect(mean.weight).toBe(0);
  });
});

describe("band histogram", () => {
  it("emits every band so an empty band reads as a real zero in the scored subset", () => {
    const bands = buildBandBuckets(
      [
        testOccupation("2512", { employedPersons: 100, theoreticalAIExposure: 9.2 }),
        testOccupation("7111", { employedPersons: 300, theoreticalAIExposure: 2.1 }),
        testOccupation("5321", { employedPersons: 999, ...unscored }),
      ],
      "exposure",
    );
    expect(bands.map((bucket) => bucket.band)).toEqual(BAND_ORDER);
    const byBand = new Map(bands.map((bucket) => [bucket.band, bucket]));
    expect(byBand.get("910")?.employedPersons).toBe(100);
    expect(byBand.get("12")?.employedPersons).toBe(300);
    expect(byBand.get("56")?.occupationCount).toBe(0);
    // Shares divide by scored employment only, so the unscored 999 is excluded.
    expect(byBand.get("910")?.share).toBeCloseTo(0.25);
  });

  it("is empty, not flat, when nothing is scored", () => {
    expect(buildBandBuckets([testOccupation("7111", { ...unscored })], "exposure")).toEqual([]);
  });
});

describe("official outlook mix", () => {
  it("covers unscored rows and keeps the unavailable class visible", () => {
    const buckets = buildOutlookBuckets([
      testOccupation("2512", { employedPersons: 100, laborMarketOutlook: "shortage" }),
      testOccupation("7111", { employedPersons: 300, laborMarketOutlook: "unavailable", ...unscored }),
    ]);
    const byOutlook = new Map(buckets.map((bucket) => [bucket.outlook, bucket]));
    expect(byOutlook.get("shortage")?.employedPersons).toBe(100);
    expect(byOutlook.get("unavailable")?.occupationCount).toBe(1);
    expect(byOutlook.get("unavailable")?.share).toBeCloseTo(0.75);
    expect(byOutlook.get("surplus")?.share).toBe(0);
  });
});

describe("cross-tabs", () => {
  it("leaves a cell with no scored row unavailable instead of zero", () => {
    const rows = [
      testOccupation("2512", { employedPersons: 100, laborMarketOutlook: "balanced", theoreticalAIExposure: 9 }),
      testOccupation("7111", { employedPersons: 100, laborMarketOutlook: "shortage", ...unscored }),
    ];
    const cells = new Map(buildCrossOutlook(rows, "exposure").map((cell) => [cell.key, cell]));
    expect(cells.get("balanced")?.weightedMean).toBe(9);
    expect(cells.get("shortage")?.occupationCount).toBe(1);
    expect(cells.get("shortage")?.scoredCount).toBe(0);
    expect(cells.get("shortage")?.weightedMean).toBeNull();
  });

  it("exposes the n behind every major-group cell", () => {
    const cells = buildCrossMajorGroup(
      [
        testOccupation("2512", { employedPersons: 100, theoreticalAIExposure: 9 }),
        testOccupation("7111", {
          employedPersons: 100,
          majorGroupCode: "7",
          majorGroupName: "Rakennustyöntekijät",
          theoreticalAIExposure: 2,
        }),
      ],
      "exposure",
    );
    expect(cells.map((cell) => cell.key)).toEqual(["2", "7"]);
    expect(cells[0].scoredCount).toBe(1);
    expect(cells[1].fallbackLabel).toBe("Rakennustyöntekijät");
  });
});

describe("committed catalog composition", () => {
  it("is honest about how little of the market is scored", async () => {
    const { loadCatalog } = await import("../src/lib/catalog");
    const visual = visualOccupations(loadCatalog().occupations);
    const composition = marketCompositionSchema.parse(buildMarketComposition(visual, "exposure"));

    expect(composition.coverage.occupationCount).toBe(436);
    expect(composition.coverage.scoredCount).toBe(24);
    // Fewer than one occupation in ten is scored, and every fixture is labelled.
    expect(composition.coverage.rowShare).toBeLessThan(0.1);
    expect(composition.coverage.fixtureCount).toBe(24);
    expect(composition.coverage.llmCount).toBe(0);
    // The scored subset covers well under half of employment, so the mean below
    // must never be presented without this number next to it.
    expect(composition.coverage.employedShare).toBeLessThan(0.5);
    expect(composition.ai.weightedMean).not.toBeNull();

    // The official mix needs no scores, so it covers the whole view.
    const officialRows = composition.official.outlook.reduce((sum, b) => sum + b.occupationCount, 0);
    expect(officialRows).toBe(436);

    // Outlook classes with no scored occupation stay unavailable.
    const shortage = composition.crossOutlook.find((cell) => cell.key === "shortage");
    expect(shortage?.occupationCount).toBe(1);
    expect(shortage?.weightedMean).toBeNull();
  });

  it("never reports a salary or wage field", () => {
    const composition = buildMarketComposition(
      [testOccupation("2512", { employedPersons: 100, theoreticalAIExposure: 9 })],
      "exposure",
    );
    const serialised = JSON.stringify(composition).toLowerCase();
    for (const banned of ["palkka", "salary", "wage", "pay", "euro"]) {
      expect(serialised).not.toContain(banned);
    }
  });
});

describe("share rounding", () => {
  it("keeps a tiny but non-zero employment share distinguishable from zero", () => {
    // 1 058 of 2 314 785 rounds to 0,0 % at one decimal; the panel must not
    // present a four-figure number of people as a flat zero.
    const buckets = buildOutlookBuckets([
      testOccupation("2512", { employedPersons: 1058, laborMarketOutlook: "shortage" }),
      testOccupation("7111", { employedPersons: 2313727, laborMarketOutlook: "surplus" }),
    ]);
    const shortage = buckets.find((bucket) => bucket.outlook === "shortage");
    expect(shortage?.share).toBeGreaterThan(0);
    expect(shortage?.share).toBeLessThan(0.001);
  });
});

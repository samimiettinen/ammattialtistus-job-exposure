import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { mergeOccupations } from "../src/lib/pipeline/merge";
import {
  aggregateNationalOutlook,
  outlookFromKohtaantotila,
  parseBarometerRegions,
  parseKohtaantoRows,
  toRegionalOutlook,
} from "../src/lib/pipeline/outlook";
import { occupationSchema } from "../src/lib/schemas";
import { baseParsed } from "./helpers";

const example = JSON.parse(fs.readFileSync("data/fixtures/outlook_adapter.example.json", "utf8"));
const exampleRecord = example.records[0];
const regions = parseBarometerRegions(example.regions);
const rows = parseKohtaantoRows(exampleRecord.regional);

describe("kohtaantotila mapping", () => {
  it("maps the barometer's own enum and never guesses an outlook", () => {
    expect(outlookFromKohtaantotila(0)).toBe("balanced");
    expect(outlookFromKohtaantotila(1)).toBe("surplus");
    expect(outlookFromKohtaantotila(2)).toBe("mismatch");
    expect(outlookFromKohtaantotila(3)).toBe("shortage");
    expect(outlookFromKohtaantotila(99)).toBe("unavailable");
    expect(outlookFromKohtaantotila(7)).toBe("unavailable");
  });
});

describe("regional kohtaanto rows", () => {
  it("names regions through the documented groupingId join", () => {
    const regional = toRegionalOutlook(rows, regions);
    expect(regional).toHaveLength(2);
    expect(regional[0].regionId).toBe("0ba006ef-3d5f-40d2-8789-1378e8fcb7b0");
    expect(regional[0].regionName).toBe(regions[0].nimi);
    expect(regional[0].laborMarketOutlook).toBe("surplus");
    expect(regional[0].employedPersons).toBe(2380);
    expect(regional[0].matchingDegree).toBe(3);
  });

  it("leaves a region unnamed rather than guessing from the uuid", () => {
    const regional = toRegionalOutlook(rows, []);
    expect(regional[0].regionName).toBeNull();
    expect(regional[0].regionCode).toBeNull();
  });

  it("keeps a censored count missing instead of turning it into a zero", () => {
    const censored = toRegionalOutlook(rows, regions)[1];
    expect(censored.employedCensored).toBe(true);
    expect(censored.employedPersons).toBeNull();
    expect(censored.unemployedCensored).toBe(true);
    expect(censored.unemployedJobseekers).toBeNull();
    expect(censored.matchingState).toBe(99);
    expect(censored.laborMarketOutlook).toBe("unavailable");
    expect(censored.matchingDegree).toBeNull();
  });

  it("drops a kohtaantoaste outside the barometer's 1-5 grade", () => {
    const regional = toRegionalOutlook(
      parseKohtaantoRows([
        { groupingId: "x", kohtaantotila: 3, kohtaantoaste: 9, kohtaantoTime: "2026-06" },
        { groupingId: "y", kohtaantotila: 3, kohtaantoaste: 2.5, kohtaantoTime: "2026-06" },
      ]),
      [],
    );
    expect(regional[0].matchingDegree).toBeNull();
    expect(regional[1].matchingDegree).toBeNull();
  });
});

describe("merge carries the regional rows", () => {
  const outlook = aggregateNationalOutlook({
    occupationCode: "2512",
    barometer: { nimi: "Sovellussuunnittelijat", id: exampleRecord.barometerId, koodi: "2512" },
    period: "2026-06",
    regional: rows,
  });

  it("persists regions on the occupation record alongside the national composite", () => {
    const merged = mergeOccupations({
      occupations: [baseParsed("2512")],
      employment: [],
      outlook: [outlook],
      scores: [],
      regions,
    });
    expect(merged[0].regionalOutlook).toHaveLength(2);
    expect(merged[0].regionalOutlook[0].regionName).toBe(regions[0].nimi);
    // The national figure stays the documented composite, not a KEHA index.
    expect(merged[0].outlookSource).toContain("kooste");
  });

  it("defaults to an empty list when the outlook record has no regional rows", () => {
    const merged = mergeOccupations({
      occupations: [baseParsed("2512")],
      employment: [],
      outlook: [],
      scores: [],
    });
    expect(merged[0].regionalOutlook).toEqual([]);
  });
});

describe("catalog compatibility", () => {
  it("parses a record written before regionalOutlook existed", () => {
    const parsed = occupationSchema.parse({
      ...baseParsed("2512"),
      employedPersons: 100,
      employmentDataYear: 2023,
      laborMarketOutlook: "balanced",
      shortageSurplusIndex: 0,
      outlookSource: "test",
      theoreticalAIExposure: null,
      currentAIAdoption: null,
      exposureRationale: null,
      adoptionRationale: null,
      humanCriticalTasks: [],
      AIApplicableTasks: [],
      uncertainty: null,
      scoredAt: null,
      scoringModel: null,
      promptVersion: null,
      employmentStale: true,
      outlookStale: false,
      scoreStatus: "unscored",
    });
    expect(parsed.regionalOutlook).toEqual([]);
  });

  it("still loads the committed catalog", async () => {
    const { loadCatalog, visualOccupations } = await import("../src/lib/catalog");
    const visual = visualOccupations(loadCatalog().occupations);
    expect(visual.length).toBe(436);
    expect(visual.every((row) => Array.isArray(row.regionalOutlook))).toBe(true);
  });
});

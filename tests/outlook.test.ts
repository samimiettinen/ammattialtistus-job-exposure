import { describe, expect, it } from "vitest";
import { aggregateNationalOutlook, isOutlookStale, signedKohtaantoAste } from "../src/lib/pipeline/outlook";

const barometer = {
  nimi: "Sovellussuunnittelijat",
  id: "dd1b7558-21fb-43a5-b07a-33bb01878cad",
  koodi: "2512",
};

describe("outlook aggregation", () => {
  it("weights regional kohtaantotila by toissa and signs the index", () => {
    const record = aggregateNationalOutlook({
      occupationCode: "2512",
      barometer,
      period: "2026-06",
      regional: [
        {
          groupingId: "a",
          kohtaantotila: 1,
          kohtaantoaste: 4,
          toissa: 8000,
          toissaSensuroitu: false,
          kohtaantoTime: "2026-06",
        },
        {
          groupingId: "b",
          kohtaantotila: 3,
          kohtaantoaste: 2,
          toissa: 1000,
          toissaSensuroitu: false,
          kohtaantoTime: "2026-06",
        },
      ],
    });
    expect(record.laborMarketOutlook).toBe("surplus");
    expect(record.shortageSurplusIndex).toBeCloseTo((-4 * 8000 + 2 * 1000) / 9000, 2);
    expect(record.usableRegionCount).toBe(2);
  });

  it("does not invent outlook when regions are missing or censored", () => {
    const record = aggregateNationalOutlook({
      occupationCode: "2512",
      barometer,
      period: "2026-06",
      regional: [
        { groupingId: "a", kohtaantotila: 3, kohtaantoaste: 5, toissa: 10, toissaSensuroitu: true },
        { groupingId: "b", kohtaantotila: 99, kohtaantoaste: 2, toissa: 50, toissaSensuroitu: false },
      ],
    });
    expect(record.laborMarketOutlook).toBe("unavailable");
    expect(record.shortageSurplusIndex).toBeNull();
  });

  it("signs shortage positive and surplus negative", () => {
    expect(signedKohtaantoAste({ groupingId: "x", kohtaantotila: 3, kohtaantoaste: 5 })).toBe(5);
    expect(signedKohtaantoAste({ groupingId: "x", kohtaantotila: 1, kohtaantoaste: 5 })).toBe(-5);
    expect(signedKohtaantoAste({ groupingId: "x", kohtaantotila: 0, kohtaantoaste: 1 })).toBe(0);
  });

  it("marks outlook stale after six months", () => {
    expect(isOutlookStale("2026-06", "2026-08-29")).toBe(false);
    expect(isOutlookStale("2025-12", "2026-08-29")).toBe(true);
  });
});

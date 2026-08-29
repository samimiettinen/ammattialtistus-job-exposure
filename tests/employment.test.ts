import { describe, expect, it } from "vitest";
import { parseEmploymentJsonStat } from "../src/lib/pipeline/employment";

describe("employment parser", () => {
  it("reads json-stat2 values and flags dotted residual codes", () => {
    const parsed = parseEmploymentJsonStat({
      updated: "2025-06-03T05:00:00Z",
      source: "Tilastokeskus, työssäkäynti",
      value: [35435, 12],
      dimension: {
        ammatti_104_20161021: {
          category: {
            index: { "2512": 0, "0110.": 1 },
            label: {
              "2512": "2512 Sovellussuunnittelijat (Taso 4)",
              "0110.": "0110. Upseerit (Taso 5)",
            },
          },
        },
      },
      extension: { px: { tableid: "115r" } },
    });
    expect(parsed.tableId).toBe("115r");
    expect(parsed.rows[0]).toMatchObject({
      occupationCode: "2512",
      employedPersons: 35435,
      isResidualPxCode: false,
      year: 2023,
    });
    expect(parsed.rows[1]?.isResidualPxCode).toBe(true);
  });

  it("skips null observations instead of inventing counts", () => {
    const parsed = parseEmploymentJsonStat({
      value: [null],
      dimension: {
        ammatti_104_20161021: {
          category: { index: { "9999": 0 }, label: { "9999": "missing" } },
        },
      },
    });
    expect(parsed.rows).toHaveLength(0);
  });
});

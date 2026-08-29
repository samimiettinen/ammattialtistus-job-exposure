import { describe, expect, it } from "vitest";
import { extractDescription, majorGroupOf, parentCodeOf, parseClassificationBundle } from "../src/lib/pipeline/classification";

const item = (code: string, level: number, name: string, parent: string | null, note?: string) => ({
  localId: `ammatti_1_20100101/${code}`,
  level,
  code,
  parentCode: parent,
  classificationItemNames: [{ lang: "fi", name }],
  explanatoryNotes: note
    ? [{ generalNote: [note], includes: [""], excludes: [""] }]
    : [],
});

describe("classification parser", () => {
  it("joins FI/SV/EN names and skips totals", () => {
    const parsed = parseClassificationBundle({
      fi: [item("SSSSS", 0, "Yhteensä", null), item("2", 1, "Erityisasiantuntijat", null), item("2512", 4, "Sovellussuunnittelijat", "251")],
      sv: [item("2512", 4, "Applikationsplanerare", "251")],
      en: [item("2512", 4, "Software developers", "251")],
    });
    expect(parsed).toHaveLength(2);
    const occ = parsed.find((row) => row.occupationCode === "2512");
    expect(occ?.occupationNameSv).toBe("Applikationsplanerare");
    expect(occ?.occupationNameEn).toBe("Software developers");
    expect(occ?.majorGroupCode).toBe("2");
    expect(occ?.majorGroupName).toBe("Erityisasiantuntijat");
  });

  it("extracts Finnish notes and reports missing descriptions", () => {
    expect(extractDescription(item("2512", 4, "X", "251", "Suunnittelevat ohjelmistoja.")).available).toBe(true);
    expect(extractDescription(item("X", 1, "Tuntematon", null)).available).toBe(false);
  });

  it("maps major groups including X and 0", () => {
    expect(majorGroupOf("2512")).toBe("2");
    expect(majorGroupOf("0110")).toBe("0");
    expect(majorGroupOf("XXXXX")).toBe("X");
    expect(parentCodeOf("2512")).toBe("251");
    expect(parentCodeOf("X")).toBeNull();
  });
});

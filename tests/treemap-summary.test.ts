import { describe, expect, it } from "vitest";
import { visualOccupations } from "../src/lib/catalog";
import { parentCodeOf } from "../src/lib/pipeline/classification";
import { buildTreemapHierarchy, shouldShowTreemapLabel } from "../src/lib/treemap-data";
import { buildViewSummary } from "../src/lib/view-summary";
import { testOccupation } from "./helpers";

describe("treemap hierarchy and labels", () => {
  it("nests classified occupations and excludes XXXX", () => {
    const occupations = [
      testOccupation("2512", { employedPersons: 35000, majorGroupName: "Erityisasiantuntijat" }),
      testOccupation("XXXX", {
        occupationCode: "XXXX",
        majorGroupCode: "X",
        majorGroupName: "Tuntematon",
        occupationNameFi: "Tuntematon",
        occupationNameSv: "Okänd",
        occupationNameEn: "Unknown",
        employedPersons: 102555,
        theoreticalAIExposure: null,
        scoreStatus: "unscored",
      }),
    ];
    const tree = buildTreemapHierarchy({
      occupations,
      hierarchy: [
        {
          occupationCode: "2",
          level: 1,
          occupationNameFi: "Erityisasiantuntijat",
          occupationNameSv: "Specialister",
          occupationNameEn: "Professionals",
        },
        {
          occupationCode: "25",
          level: 2,
          occupationNameFi: "ICT-asiantuntijat",
          occupationNameSv: "ICT-specialister",
          occupationNameEn: "ICT professionals",
        },
        {
          occupationCode: "251",
          level: 3,
          occupationNameFi: "Sovellusasiantuntijat",
          occupationNameSv: "Programvaruspecialister",
          occupationNameEn: "Software professionals",
        },
      ],
      locale: "fi",
      metric: "exposure",
      selectedCode: "2512",
    });

    expect(tree.map((node) => node.code)).toEqual(["2"]);
    expect(JSON.stringify(tree)).not.toContain("XXXX");
    expect(JSON.stringify(tree)).not.toContain("Tuntematon");
    const leaf = tree[0] && "children" in tree[0] ? tree[0].children[0] : null;
    expect(leaf && "children" in leaf ? leaf.children[0] && "children" in leaf.children[0] : false).toBe(true);
  });

  it("hides labels that cannot fit in full and keeps those that can", () => {
    expect(shouldShowTreemapLabel("2512 Sovellussuunnittelijat", 20, 12)).toBe(false);
    expect(shouldShowTreemapLabel("2512 Sovellussuunnittelijat", 400, 80)).toBe(true);
  });

  it("derives parent codes without a rematch", () => {
    expect(parentCodeOf("2512")).toBe("251");
    expect(parentCodeOf("2")).toBeNull();
    expect(parentCodeOf("XXXX")).toBe("XXX");
  });
});

describe("view summary", () => {
  it("reports occupation and worker counts and a high-exposure share", () => {
    const summary = buildViewSummary([
      testOccupation("2512", { employedPersons: 100, theoreticalAIExposure: 9 }),
      testOccupation("7111", { employedPersons: 100, theoreticalAIExposure: 2 }),
    ]);
    expect(summary.occupationCount).toBe(2);
    expect(summary.workerCount).toBe(200);
    expect(summary.highExposureShare).toBe(0.5);
  });

  it("does not invent a high-exposure share when nothing is scored", () => {
    const summary = buildViewSummary([
      testOccupation("7111", {
        employedPersons: 100,
        theoreticalAIExposure: null,
        currentAIAdoption: null,
        scoreStatus: "unscored",
      }),
    ]);
    expect(summary.highExposureShare).toBeNull();
  });
});

describe("committed catalog still parses", () => {
  it("loads occupations.json with optional Phase 1 fields", async () => {
    const { loadCatalog, visualOccupations } = await import("../src/lib/catalog");
    const catalog = loadCatalog();
    const visual = visualOccupations(catalog.occupations);
    expect(visual.length).toBe(436);
    expect(visual.every((row) => row.occupationCode !== "XXXX")).toBe(true);
  });
});

describe("visual occupation filter", () => {
  it("drops residual unknown codes from the chart catalogue", () => {
    const visual = visualOccupations([
      testOccupation("2512"),
      testOccupation("XXXX", {
        occupationCode: "XXXX",
        majorGroupCode: "X",
        employedPersons: 102555,
      }),
    ]);
    expect(visual.map((row) => row.occupationCode)).toEqual(["2512"]);
  });
});

import { describe, expect, it } from "vitest";
import { buildHumanCore, humanCoreForOccupation, tasksFromOccupation, TASK_GROUP_ORDER } from "../src/lib/human-core";
import { SOURCE_URLS } from "../src/lib/pipeline/paths";
import { buildSourceLinks, sourceLabelKey } from "../src/lib/source-links";
import { testOccupation } from "./helpers";

describe("what remains human", () => {
  it("puts human work first and counts each group", () => {
    const core = humanCoreForOccupation(
      testOccupation("2512", {
        humanCriticalTasks: ["vastuu asiakkaasta", "eettinen harkinta"],
        AIApplicableTasks: ["luonnostelu"],
      }),
    );
    expect(core.groups[0].classification).toBe("human");
    expect(core.groups[0].tasks).toHaveLength(2);
    expect(core.humanCount).toBe(2);
    expect(core.totalCount).toBe(3);
    expect(core.humanShare).toBeCloseTo(2 / 3);
    expect(core.available).toBe(true);
  });

  it("reports no share at all when the task list is empty", () => {
    const core = humanCoreForOccupation(
      testOccupation("7111", { humanCriticalTasks: [], AIApplicableTasks: [] }),
    );
    expect(core.available).toBe(false);
    expect(core.totalCount).toBe(0);
    // An absent list is unavailable, never a zero share.
    expect(core.humanShare).toBeNull();
    expect(core.groups).toEqual([]);
  });

  it("drops empty groups but keeps the declared order for those present", () => {
    const core = buildHumanCore([
      { text: "a", classification: "accelerate" },
      { text: "b", classification: "human" },
      { text: "c", classification: "insufficient" },
    ]);
    expect(core.groups.map((group) => group.classification)).toEqual([
      "human",
      "accelerate",
      "insufficient",
    ]);
    expect(TASK_GROUP_ORDER[0]).toBe("human");
  });

  it("prefers a workday task list over the occupation's own when one is supplied", () => {
    const occupation = testOccupation("2512", {
      humanCriticalTasks: ["katalogitehtävä"],
      AIApplicableTasks: [],
    });
    const core = humanCoreForOccupation(occupation, [
      { text: "käyttäjän tehtävä", classification: "assist" },
    ]);
    expect(core.totalCount).toBe(1);
    expect(core.groups[0].classification).toBe("assist");
    expect(tasksFromOccupation(occupation)[0].text).toBe("katalogitehtävä");
  });
});

describe("official source links", () => {
  it("labels every URL the pipeline records, so none falls back to a bare host", () => {
    for (const url of SOURCE_URLS) {
      expect(sourceLabelKey(url), `no label for ${url}`).not.toBeNull();
    }
  });

  it("keeps an unrecognised URL honest instead of describing it", () => {
    const links = buildSourceLinks({
      sourceUrls: ["https://example.org/whatever"],
      evidence: [],
    });
    expect(links[0].labelKey).toBeNull();
    expect(links[0].host).toBe("example.org");
  });

  it("builds one labelled link per recorded URL and drops duplicates and non-http entries", () => {
    const links = buildSourceLinks({
      sourceUrls: [
        "https://tyovoimabarometri.fi/api/ammatit",
        "https://tyovoimabarometri.fi/api/ammatit",
        "not-a-url",
      ],
      evidence: [],
    });
    expect(links).toHaveLength(1);
    expect(links[0].labelKey).toBe("barometerCatalog");
    expect(links[0].kind).toBe("official");
  });

  it("does not invent a per-occupation deep link", () => {
    const occupation = testOccupation("2512");
    const links = buildSourceLinks(occupation);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.url).not.toContain(occupation.occupationCode);
    }
  });
});

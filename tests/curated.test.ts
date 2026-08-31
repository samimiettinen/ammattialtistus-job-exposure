import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "../src/lib/catalog";
import { loadCuratedProfiles } from "../src/lib/curated";
import {
  buildCuratedCoverage,
  curatedIntegrityErrors,
  curatedProfilesForOccupation,
  isAxisStale,
  isValidated,
  renderableSources,
  tasksForModules,
} from "../src/lib/curated-view";
import { curatedProfileSchema, CURATED_UI_FORBIDDEN_HOSTS } from "../src/lib/schemas";

const CURATED_DIR = path.join(process.cwd(), "data", "curated");

function curatedFiles(): string[] {
  if (!fs.existsSync(CURATED_DIR)) return [];
  return fs.readdirSync(CURATED_DIR).filter((name) => name.endsWith(".json"));
}

describe("committed curated content, read from disk", () => {
  it("parses every committed profile", () => {
    const files = curatedFiles();
    expect(files.length).toBeGreaterThan(0);
    for (const name of files) {
      const raw = JSON.parse(fs.readFileSync(path.join(CURATED_DIR, name), "utf8"));
      expect(() => curatedProfileSchema.parse(raw), name).not.toThrow();
    }
  });

  it("labels itself as an unvalidated draft while no panel has reviewed it", () => {
    // The committed self-labelling contract, mirroring the fixture-score rule in
    // tests/schema-provenance.test.ts. A profile may only claim panel review
    // once a reviewer actually exists.
    for (const profile of loadCuratedProfiles()) {
      if (profile.validatedBy === 0) expect(profile.status, profile.profileId).toBe("draft");
      if (profile.status === "panel_reviewed") {
        expect(profile.validatedBy).toBeGreaterThanOrEqual(1);
        expect(profile.reviewedAt).not.toBeNull();
      }
      for (const task of profile.tasks) {
        if (task.validatedBy === 0) expect(task.status, task.taskId).toBe("draft");
      }
    }
  });

  it("never cites a US occupational classification in a renderable source", () => {
    for (const profile of loadCuratedProfiles()) {
      const rendered = [
        ...renderableSources(profile.sources),
        ...profile.tasks.flatMap((task) => renderableSources(task.sources)),
      ];
      for (const source of rendered) {
        for (const banned of CURATED_UI_FORBIDDEN_HOSTS) {
          expect(source.url, `${profile.profileId} renders ${source.url}`).not.toContain(banned);
        }
      }
    }
  });

  it("keeps a site-level reference out of the rendered sources", () => {
    // The source material's own critique log flagged that its ESCO reference is
    // front-page only. A reference that anchors nothing must not be presented
    // as if it anchored a card.
    for (const profile of loadCuratedProfiles()) {
      for (const source of renderableSources(profile.sources)) {
        expect(source.precision).not.toBe("site");
      }
    }
  });

  it("gives every score a stated reason", () => {
    for (const profile of loadCuratedProfiles()) {
      expect(curatedIntegrityErrors(profile), profile.profileId).toEqual([]);
    }
  });

  it("carries no salary or wage field", () => {
    for (const name of curatedFiles()) {
      const raw = fs.readFileSync(path.join(CURATED_DIR, name), "utf8").toLowerCase();
      for (const banned of ["palkka", "salary", "wage", '"pay"']) {
        expect(raw, `${name} contains ${banned}`).not.toContain(banned);
      }
    }
  });
});

describe("developer profile content", () => {
  const profile = loadCuratedProfiles().find((item) => item.profileId === "ai-assisted-developer");

  it("has the 24 cards the source material specifies, split across its modules", () => {
    expect(profile).toBeDefined();
    expect(profile!.tasks).toHaveLength(24);
    const perModule = new Map<string, number>();
    for (const task of profile!.tasks) {
      perModule.set(task.moduleId, (perModule.get(task.moduleId) ?? 0) + 1);
    }
    expect(Object.fromEntries(perModule)).toEqual({
      core: 6,
      frontend: 4,
      backend: 4,
      data_ml: 4,
      devops: 3,
      entry: 3,
    });
  });

  it("keeps the two axes independent, with tasks scoring high on both", () => {
    // The source material states this explicitly. A card high on both axes is
    // the whole point: AI can accelerate the work and a person still carries it.
    const both = profile!.tasks.filter(
      (task) => (task.aiAssistance.value ?? 0) >= 4 && (task.humanCriticality.value ?? 0) >= 4,
    );
    expect(both.length).toBeGreaterThan(0);
  });

  it("anchors to AML codes that exist, without claiming to be one of them", () => {
    const codes = new Set(loadCatalog().occupations.map((row) => row.occupationCode));
    for (const anchor of profile!.anchors) expect(codes.has(anchor.occupationCode), anchor.occupationCode).toBe(true);
    expect(profile!.anchors.filter((a) => a.strength === "primary")).toHaveLength(1);
    expect(profile!.anchors.length).toBeGreaterThan(1);
  });

  it("is reachable from each of its anchor occupations", () => {
    const profiles = loadCuratedProfiles();
    expect(curatedProfilesForOccupation(profiles, "2512")).toHaveLength(1);
    expect(curatedProfilesForOccupation(profiles, "7111")).toHaveLength(0);
  });

  it("selects core tasks plus the chosen path only", () => {
    const selected = tasksForModules(profile!, ["devops"]);
    expect(selected).toHaveLength(9);
    expect(new Set(selected.map((t) => t.moduleId))).toEqual(new Set(["core", "devops"]));
  });
});

describe("axis staleness", () => {
  const axis = { value: 4, why: "syy", reviewedAt: "2026-08-30" };

  it("marks an AI score stale only once the review interval has passed", () => {
    expect(isAxisStale(axis, 12, new Date("2027-02-01T00:00:00Z"))).toBe(false);
    expect(isAxisStale(axis, 12, new Date("2027-10-01T00:00:00Z"))).toBe(true);
  });

  it("treats an absent score as unavailable rather than stale", () => {
    expect(isAxisStale({ value: null, why: null, reviewedAt: null }, 12)).toBe(false);
  });

  it("treats a score with no review date as stale", () => {
    expect(isAxisStale({ value: 3, why: "syy", reviewedAt: null }, 12)).toBe(true);
  });
});

describe("validation gate", () => {
  it("refuses to call a profile validated without a reviewer", () => {
    expect(isValidated({ status: "panel_reviewed", validatedBy: 0 })).toBe(false);
    expect(isValidated({ status: "draft", validatedBy: 3 })).toBe(false);
    expect(isValidated({ status: "panel_reviewed", validatedBy: 3 })).toBe(true);
  });

  it("reports completeness per profile instead of hiding the gap", () => {
    const catalog = loadCatalog().occupations;
    for (const profile of loadCuratedProfiles()) {
      const coverage = buildCuratedCoverage(profile, catalog);
      expect(coverage.ok).toBe(true);
      expect(coverage.taskCount).toBeGreaterThan(0);
      expect(coverage.axisCompleteness).not.toBeNull();
      // Nothing is validated yet, and the report says so rather than implying otherwise.
      expect(coverage.validatedTaskCount).toBe(0);
      expect(coverage.warnings).toContain(`${profile.profileId}: unvalidated draft`);
    }
  });
});

describe("client safety", () => {
  it("keeps node built-ins out of the module a client component imports", () => {
    // src/components/CuratedPath.tsx and DetailPanel.tsx import curated-view.
    // Pulling node:fs in through it would bundle it into the browser build.
    const view = fs.readFileSync(path.join(process.cwd(), "src", "lib", "curated-view.ts"), "utf8");
    const imports = [...view.matchAll(/(?:from|require\()\s*["']([^"']+)["']/g)].map((m) => m[1]);
    expect(imports.length).toBeGreaterThan(0);
    for (const specifier of imports) {
      expect(specifier.startsWith("node:"), `curated-view imports ${specifier}`).toBe(false);
      expect(specifier).not.toContain("pipeline/paths");
    }
    // The loader is the one allowed to touch the filesystem.
    const loader = fs.readFileSync(path.join(process.cwd(), "src", "lib", "curated.ts"), "utf8");
    expect(loader).toContain('from "node:fs"');
  });
});

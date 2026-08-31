import fs from "node:fs";
import path from "node:path";
import { loadCatalog } from "../src/lib/catalog";
import { loadCuratedProfiles } from "../src/lib/curated";
import { buildCuratedCoverage } from "../src/lib/curated-view";

/**
 * Gate for curated golden-set content, alongside scripts/06 for the catalog.
 * Exits non-zero on any integrity error, so unvalidated or mislabelled
 * editorial content cannot ship looking like something it is not.
 */
function main() {
  const profiles = loadCuratedProfiles();
  const catalog = loadCatalog().occupations;

  if (profiles.length === 0) {
    console.log("No curated profiles found in data/curated. Nothing to validate.");
    return;
  }

  const reports = profiles.map((profile) => buildCuratedCoverage(profile, catalog));
  const report = {
    generatedAt: new Date().toISOString(),
    profileCount: profiles.length,
    profiles: reports,
    ok: reports.every((item) => item.ok),
  };

  console.log(JSON.stringify(report, null, 2));
  const out = path.join(process.cwd(), "data", "curated-validation-report.json");
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`Wrote ${path.relative(process.cwd(), out)}`);
  if (!report.ok) process.exit(1);
}

main();

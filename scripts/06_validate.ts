import fs from "node:fs";
import path from "node:path";
import { validateOccupations } from "../src/lib/pipeline/validate";
import { files } from "../src/lib/pipeline/paths";
import { mergedCatalogFileSchema } from "../src/lib/schemas/pipeline";

function main() {
  if (!fs.existsSync(files.occupationsJson)) {
    throw new Error("Missing data/occupations.json. Run script 05.");
  }
  const raw = JSON.parse(fs.readFileSync(files.occupationsJson, "utf8"));
  const catalog = mergedCatalogFileSchema.parse(raw);
  const report = validateOccupations(catalog.occupations);
  fs.writeFileSync(files.validationReport, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`Wrote ${path.relative(process.cwd(), files.validationReport)}`);
  if (!report.ok) process.exit(1);
}

main();

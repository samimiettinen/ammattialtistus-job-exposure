import fs from "node:fs";
import path from "node:path";
import { isUnclassifiedOccupation } from "./occupation-view";
import { mergedCatalogFileSchema, type MergedCatalogFile, type Occupation } from "./schemas";

let cache: MergedCatalogFile | null = null;

export function loadCatalog(): MergedCatalogFile {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), "data", "occupations.json");
  if (!fs.existsSync(filePath)) {
    throw new Error("data/occupations.json missing. Run the data pipeline.");
  }
  cache = mergedCatalogFileSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf8")));
  return cache;
}

export function visualOccupations(occupations: Occupation[]): Occupation[] {
  return occupations.filter((row) => row.level === 4 && !isUnclassifiedOccupation(row));
}

export function hierarchyOccupations(occupations: Occupation[]): Occupation[] {
  return occupations.filter((row) => row.level >= 1 && row.level <= 3 && !isUnclassifiedOccupation(row));
}

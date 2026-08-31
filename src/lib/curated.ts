import fs from "node:fs";
import path from "node:path";
import { curatedProfileSchema, type CuratedProfile } from "./schemas/curated";

/**
 * Disk loader for curated golden-set profiles. SERVER ONLY — it uses `node:fs`.
 * Pure helpers live in `src/lib/curated-view.ts`; a client component must
 * import from there.
 *
 * Follows the `src/lib/catalog.ts` pattern: module-level cache, existsSync
 * guard, schema.parse, then cache. Like `catalog.ts` it deliberately does not
 * import `src/lib/pipeline/paths.ts`.
 */

const CURATED_DIR = "curated";

let cache: CuratedProfile[] | null = null;

function curatedDir(): string {
  return path.join(process.cwd(), "data", CURATED_DIR);
}

export function loadCuratedProfiles(): CuratedProfile[] {
  if (cache) return cache;
  const dir = curatedDir();
  if (!fs.existsSync(dir)) {
    cache = [];
    return cache;
  }
  const profiles = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => curatedProfileSchema.parse(JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"))));
  cache = profiles;
  return cache;
}

import fs from "node:fs";
import path from "node:path";
import { EMPLOYMENT_QUERY, parseEmploymentJsonStat } from "../src/lib/pipeline/employment";
import { fetchJson } from "../src/lib/pipeline/http";
import { EMPLOYMENT_PX_URL, EMPLOYMENT_YEAR, RETRIEVED_AT, RAW_DIR, files } from "../src/lib/pipeline/paths";

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const payload = await fetchJson<unknown>(EMPLOYMENT_PX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(EMPLOYMENT_QUERY),
  });
  const parsed = parseEmploymentJsonStat(payload, EMPLOYMENT_YEAR);
  const out = {
    retrievedAt: RETRIEVED_AT,
    url: EMPLOYMENT_PX_URL,
    tableId: parsed.tableId,
    year: EMPLOYMENT_YEAR,
    updated: parsed.updated,
    source: parsed.source,
    query: EMPLOYMENT_QUERY,
    count: parsed.rows.length,
    rows: parsed.rows,
  };
  fs.writeFileSync(files.employmentRaw, JSON.stringify(out, null, 2));
  console.log(
    `Wrote ${parsed.rows.length} employment rows (${EMPLOYMENT_YEAR}) → ${path.relative(process.cwd(), files.employmentRaw)}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

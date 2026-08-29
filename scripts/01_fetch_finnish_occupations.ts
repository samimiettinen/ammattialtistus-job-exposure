import fs from "node:fs";
import path from "node:path";
import { parseClassificationBundle, classificationItemsUrl } from "../src/lib/pipeline/classification";
import { fetchJson } from "../src/lib/pipeline/http";
import { CLASSIFICATION_LOCAL_ID, RETRIEVED_AT, files, RAW_DIR } from "../src/lib/pipeline/paths";

async function main() {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const [fi, sv, en] = await Promise.all([
    fetchJson<unknown>(classificationItemsUrl("fi")),
    fetchJson<unknown>(classificationItemsUrl("sv")),
    fetchJson<unknown>(classificationItemsUrl("en")),
  ]);

  const occupations = parseClassificationBundle({ fi, sv, en });
  const payload = {
    retrievedAt: RETRIEVED_AT,
    localId: CLASSIFICATION_LOCAL_ID,
    urls: {
      fi: classificationItemsUrl("fi"),
      sv: classificationItemsUrl("sv"),
      en: classificationItemsUrl("en"),
    },
    count: occupations.length,
    occupations,
  };

  fs.writeFileSync(files.occupationsRaw, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${occupations.length} occupations → ${path.relative(process.cwd(), files.occupationsRaw)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

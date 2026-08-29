import fs from "node:fs";
import path from "node:path";
import { mergeOccupations } from "../src/lib/pipeline/merge";
import {
  CLASSIFICATION_ITEMS_URL,
  CLASSIFICATION_LOCAL_ID,
  EMPLOYMENT_PX_URL,
  EMPLOYMENT_YEAR,
  OUTLOOK_PERIOD,
  RETRIEVED_AT,
  BAROMETER_AMMATIT_URL,
  barometerObservationUrl,
  files,
} from "../src/lib/pipeline/paths";
import { FIXTURE_MODEL, PROMPT_VERSION, scoreRecordSchema, type ScoreRecord } from "../src/lib/schemas/scores";
import { openScoreDb, readAllScores } from "../src/lib/scoring/cache";

function latestScorePerOccupation(records: ScoreRecord[]): ScoreRecord[] {
  const byCode = new Map<string, ScoreRecord>();
  const rank = (row: ScoreRecord) => {
    if (row.scoringModel?.startsWith("fixture/")) return 1;
    if (row.theoreticalAIExposure != null) return 2;
    return 0;
  };
  for (const record of records) {
    const current = byCode.get(record.occupationCode);
    if (!current || rank(record) >= rank(current)) {
      byCode.set(record.occupationCode, record);
    }
  }
  return [...byCode.values()];
}

function main() {
  if (!fs.existsSync(files.occupationsRaw)) throw new Error("Missing occupations raw. Run script 01.");
  if (!fs.existsSync(files.employmentRaw)) throw new Error("Missing employment raw. Run script 02.");

  const occupations = JSON.parse(fs.readFileSync(files.occupationsRaw, "utf8"));
  const employment = JSON.parse(fs.readFileSync(files.employmentRaw, "utf8"));
  const outlook = fs.existsSync(files.outlookRaw)
    ? JSON.parse(fs.readFileSync(files.outlookRaw, "utf8"))
    : { records: [], period: null, count: 0 };

  let scores: ScoreRecord[] = [];
  if (fs.existsSync(files.scoresFixture)) {
    scores.push(...scoreRecordSchema.array().parse(JSON.parse(fs.readFileSync(files.scoresFixture, "utf8"))));
  }
  try {
    const db = openScoreDb();
    scores.push(...readAllScores(db));
  } catch (error) {
    console.warn("SQLite cache unavailable, using fixtures only.", error);
  }
  scores = latestScorePerOccupation(scores);

  const regions = fs.existsSync(files.barometerRegions)
    ? JSON.parse(fs.readFileSync(files.barometerRegions, "utf8"))
    : (outlook.regions ?? []);

  const merged = mergeOccupations({
    occupations: occupations.occupations,
    employment: employment.rows,
    outlook: outlook.records ?? [],
    scores,
    regions,
  });

  const catalog = {
    generatedAt: new Date().toISOString(),
    retrievedAt: RETRIEVED_AT,
    provenance: {
      retrievedAt: RETRIEVED_AT,
      classification: {
        localId: CLASSIFICATION_LOCAL_ID,
        url: CLASSIFICATION_ITEMS_URL,
        itemCount: occupations.count ?? occupations.occupations.length,
      },
      employment: {
        tableId: employment.tableId ?? "115r",
        year: EMPLOYMENT_YEAR,
        url: EMPLOYMENT_PX_URL,
        updated: employment.updated ?? null,
        rowCount: employment.count ?? employment.rows.length,
      },
      outlook: {
        period: outlook.period ?? OUTLOOK_PERIOD,
        catalogUrl: BAROMETER_AMMATIT_URL,
        observationUrlTemplate: barometerObservationUrl("{id}", outlook.period ?? OUTLOOK_PERIOD),
        occupationCount: outlook.count ?? (outlook.records?.length ?? 0),
        regionCount: Array.isArray(regions) ? regions.length : 0,
        aggregation:
          "Employment-weighted majority of regional kohtaantotila; signed kohtaantoaste mean. Not an official national KEHA index.",
      },
    },
    occupations: merged,
    scoring: {
      promptVersion: PROMPT_VERSION,
      fixtureModel: FIXTURE_MODEL,
      scored: merged.filter((row) => row.scoreStatus !== "unscored").length,
    },
  };

  fs.writeFileSync(files.occupationsJson, JSON.stringify(catalog, null, 2));
  console.log(`Merged ${merged.length} occupations → ${path.relative(process.cwd(), files.occupationsJson)}`);
}

main();

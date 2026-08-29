import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { scoreRecordSchema, type ScoreRecord } from "../schemas";
import { files } from "../pipeline/paths";

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS scores (
  occupation_code TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  source_data_hash TEXT NOT NULL,
  scoring_model TEXT NOT NULL,
  theoretical_ai_exposure REAL,
  current_ai_adoption REAL,
  exposure_rationale TEXT,
  adoption_rationale TEXT,
  human_critical_tasks TEXT NOT NULL,
  ai_applicable_tasks TEXT NOT NULL,
  uncertainty TEXT,
  scored_at TEXT,
  recommended_skills TEXT,
  exposure_range_low REAL,
  exposure_range_high REAL,
  exposure_reasons TEXT,
  evidence TEXT,
  classified_skills TEXT,
  PRIMARY KEY (occupation_code, prompt_version, source_data_hash, scoring_model)
);
`;

const EXTRA_COLUMNS: Array<[string, string]> = [
  ["recommended_skills", "TEXT"],
  ["exposure_range_low", "REAL"],
  ["exposure_range_high", "REAL"],
  ["exposure_reasons", "TEXT"],
  ["evidence", "TEXT"],
  ["classified_skills", "TEXT"],
];

function ensureScoreColumns(db: Database.Database): void {
  const existing = new Set(
    (db.prepare("PRAGMA table_info(scores)").all() as Array<{ name: string }>).map((col) => col.name),
  );
  for (const [name, type] of EXTRA_COLUMNS) {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE scores ADD COLUMN ${name} ${type}`);
    }
  }
}

export function openScoreDb(dbPath = files.scoresDb): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(CREATE_SQL);
  ensureScoreColumns(db);
  return db;
}

export function getCachedScore(
  db: Database.Database,
  key: {
    occupationCode: string;
    promptVersion: string;
    sourceDataHash: string;
    scoringModel: string;
  },
): ScoreRecord | null {
  const row = db
    .prepare(
      `SELECT * FROM scores
       WHERE occupation_code = ? AND prompt_version = ? AND source_data_hash = ? AND scoring_model = ?`,
    )
    .get(key.occupationCode, key.promptVersion, key.sourceDataHash, key.scoringModel) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;
  return rowToRecord(row);
}

export function upsertScore(db: Database.Database, record: ScoreRecord): void {
  const parsed = scoreRecordSchema.parse(record);
  db.prepare(
    `INSERT INTO scores (
      occupation_code, prompt_version, source_data_hash, scoring_model,
      theoretical_ai_exposure, current_ai_adoption, exposure_rationale, adoption_rationale,
      human_critical_tasks, ai_applicable_tasks, uncertainty, scored_at,
      recommended_skills, exposure_range_low, exposure_range_high, exposure_reasons, evidence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(occupation_code, prompt_version, source_data_hash, scoring_model)
    DO UPDATE SET
      theoretical_ai_exposure = excluded.theoretical_ai_exposure,
      current_ai_adoption = excluded.current_ai_adoption,
      exposure_rationale = excluded.exposure_rationale,
      adoption_rationale = excluded.adoption_rationale,
      human_critical_tasks = excluded.human_critical_tasks,
      ai_applicable_tasks = excluded.ai_applicable_tasks,
      uncertainty = excluded.uncertainty,
      scored_at = excluded.scored_at,
      recommended_skills = excluded.recommended_skills,
      exposure_range_low = excluded.exposure_range_low,
      exposure_range_high = excluded.exposure_range_high,
      exposure_reasons = excluded.exposure_reasons,
      evidence = excluded.evidence`,
  ).run(
    parsed.occupationCode,
    parsed.promptVersion,
    parsed.sourceDataHash,
    parsed.scoringModel,
    parsed.theoreticalAIExposure,
    parsed.currentAIAdoption,
    parsed.exposureRationale,
    parsed.adoptionRationale,
    JSON.stringify(parsed.humanCriticalTasks),
    JSON.stringify(parsed.AIApplicableTasks),
    parsed.uncertainty,
    parsed.scoredAt,
    JSON.stringify(parsed.recommendedSkills ?? []),
    parsed.exposureRangeLow,
    parsed.exposureRangeHigh,
    JSON.stringify(parsed.exposureReasons ?? []),
    JSON.stringify(parsed.evidence ?? []),
  );
}

export function readAllScores(db: Database.Database): ScoreRecord[] {
  const rows = db.prepare(`SELECT * FROM scores`).all() as Record<string, unknown>[];
  return rows.map(rowToRecord);
}

function parseJsonArray(value: unknown): unknown[] {
  if (value == null || value === "") return [];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rowToRecord(row: Record<string, unknown>): ScoreRecord {
  return scoreRecordSchema.parse({
    occupationCode: row.occupation_code,
    theoreticalAIExposure: row.theoretical_ai_exposure,
    currentAIAdoption: row.current_ai_adoption,
    exposureRangeLow: row.exposure_range_low ?? null,
    exposureRangeHigh: row.exposure_range_high ?? null,
    exposureRationale: row.exposure_rationale,
    adoptionRationale: row.adoption_rationale,
    exposureReasons: parseJsonArray(row.exposure_reasons),
    humanCriticalTasks: JSON.parse(String(row.human_critical_tasks)),
    AIApplicableTasks: JSON.parse(String(row.ai_applicable_tasks)),
    recommendedSkills: parseJsonArray(row.recommended_skills),
    evidence: parseJsonArray(row.evidence),
    uncertainty: row.uncertainty,
    scoredAt: row.scored_at,
    scoringModel: row.scoring_model,
    promptVersion: row.prompt_version,
    sourceDataHash: row.source_data_hash,
  });
}

export function importFixtureScores(db: Database.Database, fixtures: ScoreRecord[]): number {
  let count = 0;
  const insert = db.transaction((records: ScoreRecord[]) => {
    for (const record of records) {
      upsertScore(db, record);
      count += 1;
    }
  });
  insert(fixtures);
  return count;
}

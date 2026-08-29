import fs from "node:fs";
import { scoreRecordSchema, type ParsedOccupation, type ScoreRecord } from "../src/lib/schemas";
import { FIXTURE_MODEL, PROMPT_VERSION } from "../src/lib/schemas/scores";
import { parseLlmScoreResponse } from "../src/lib/scoring/parse";
import { files } from "../src/lib/pipeline/paths";
import { sourceDataHash } from "../src/lib/scoring/hash";
import { scoringSystemPrompt, scoringUserPrompt } from "../src/lib/scoring/prompt";
import { getCachedScore, importFixtureScores, openScoreDb, upsertScore } from "../src/lib/scoring/cache";
import { sleep } from "../src/lib/pipeline/http";

const DEFAULT_MODEL = process.env.SCORING_MODEL ?? "gpt-4.1-mini";

function loadFixtures(): ScoreRecord[] {
  if (!fs.existsSync(files.scoresFixture)) return [];
  const raw = JSON.parse(fs.readFileSync(files.scoresFixture, "utf8"));
  return scoreRecordSchema.array().parse(raw);
}

async function scoreWithOpenAI(input: {
  occupation: ParsedOccupation;
  employedPersons: number | null;
  laborMarketOutlook: string;
  sourceDataHash: string;
}): Promise<ScoreRecord> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.SCORING_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY or SCORING_API_KEY is required for LLM scoring");
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: scoringSystemPrompt() },
        {
          role: "user",
          content: scoringUserPrompt({
            occupationCode: input.occupation.occupationCode,
            occupationNameFi: input.occupation.occupationNameFi,
            occupationNameEn: input.occupation.occupationNameEn,
            description: input.occupation.description,
            majorGroupName: input.occupation.majorGroupName,
            employedPersons: input.employedPersons,
            laborMarketOutlook: input.laborMarketOutlook,
          }),
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}: ${await response.text()}`);
  }
  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty model response");
  const parsed = parseLlmScoreResponse(JSON.parse(content));
  return {
    occupationCode: input.occupation.occupationCode,
    theoreticalAIExposure: parsed.theoreticalAIExposure,
    currentAIAdoption: parsed.currentAIAdoption,
    exposureRangeLow: parsed.exposureRangeLow ?? null,
    exposureRangeHigh: parsed.exposureRangeHigh ?? null,
    exposureRationale: parsed.exposureRationale,
    adoptionRationale: parsed.adoptionRationale,
    exposureReasons: parsed.exposureReasons ?? [],
    humanCriticalTasks: parsed.humanCriticalTasks,
    AIApplicableTasks: parsed.AIApplicableTasks,
    recommendedSkills: parsed.recommendedSkills ?? [],
    evidence: [],
    uncertainty: parsed.uncertainty,
    scoredAt: new Date().toISOString(),
    scoringModel: DEFAULT_MODEL,
    promptVersion: PROMPT_VERSION,
    sourceDataHash: input.sourceDataHash,
  };
}

async function main() {
  if (!fs.existsSync(files.occupationsRaw)) {
    throw new Error("Run scripts/01_fetch_finnish_occupations.ts first");
  }
  const occupations = JSON.parse(fs.readFileSync(files.occupationsRaw, "utf8")).occupations as ParsedOccupation[];
  const employmentRows = fs.existsSync(files.employmentRaw)
    ? (JSON.parse(fs.readFileSync(files.employmentRaw, "utf8")).rows as Array<{
        occupationCode: string;
        employedPersons: number;
        isResidualPxCode?: boolean;
      }>)
    : [];
  const outlookRows = fs.existsSync(files.outlookRaw)
    ? (JSON.parse(fs.readFileSync(files.outlookRaw, "utf8")).records as Array<{
        occupationCode: string;
        laborMarketOutlook: string;
      }>)
    : [];
  const employmentMap = new Map(
    employmentRows.filter((row) => !row.isResidualPxCode).map((row) => [row.occupationCode, row.employedPersons]),
  );
  const outlookMap = new Map(outlookRows.map((row) => [row.occupationCode, row.laborMarketOutlook]));

  const db = openScoreDb();
  const fixtures = loadFixtures();
  const imported = importFixtureScores(db, fixtures);
  console.log(`Imported ${imported} fixture scores (${FIXTURE_MODEL}).`);

  const apiKey = process.env.OPENAI_API_KEY ?? process.env.SCORING_API_KEY;
  if (!apiKey) {
    console.log("No OPENAI_API_KEY / SCORING_API_KEY. Skipping LLM scoring. Unscored occupations stay unscored.");
    return;
  }

  const targets = occupations.filter((row) => row.level === 4);
  let scored = 0;
  let skipped = 0;
  for (const occupation of targets) {
    const hash = sourceDataHash({
      occupationCode: occupation.occupationCode,
      description: occupation.description,
      employedPersons: employmentMap.get(occupation.occupationCode) ?? null,
      outlook: outlookMap.get(occupation.occupationCode) ?? "unavailable",
    });
    const cached = getCachedScore(db, {
      occupationCode: occupation.occupationCode,
      promptVersion: PROMPT_VERSION,
      sourceDataHash: hash,
      scoringModel: DEFAULT_MODEL,
    });
    if (cached) {
      skipped += 1;
      continue;
    }
    const fixtureHit = getCachedScore(db, {
      occupationCode: occupation.occupationCode,
      promptVersion: PROMPT_VERSION,
      sourceDataHash: fixtures.find((row) => row.occupationCode === occupation.occupationCode)?.sourceDataHash ?? hash,
      scoringModel: FIXTURE_MODEL,
    });
    if (fixtureHit && process.env.RESCORE_FIXTURES !== "1") {
      skipped += 1;
      continue;
    }
    try {
      const record = await scoreWithOpenAI({
        occupation,
        employedPersons: employmentMap.get(occupation.occupationCode) ?? null,
        laborMarketOutlook: outlookMap.get(occupation.occupationCode) ?? "unavailable",
        sourceDataHash: hash,
      });
      upsertScore(db, record);
      scored += 1;
      console.log(`Scored ${occupation.occupationCode} ${occupation.occupationNameFi}`);
      await sleep(400);
    } catch (error) {
      console.warn(`Failed ${occupation.occupationCode}:`, error);
      await sleep(1200);
    }
  }
  console.log(`LLM newly scored: ${scored}. Cache hits: ${skipped}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

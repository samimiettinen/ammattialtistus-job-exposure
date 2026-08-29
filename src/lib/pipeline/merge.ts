import type {
  EmploymentRow,
  Occupation,
  OutlookRecord,
  ParsedOccupation,
  ScoreRecord,
} from "../schemas";
import { occupationSchema } from "../schemas";
import { FIXTURE_MODEL } from "../schemas/scores";
import { RETRIEVED_AT } from "./paths";
import { employmentByExactCode } from "./employment";

function scoreStatusOf(score: ScoreRecord | undefined): Occupation["scoreStatus"] {
  if (!score || score.theoreticalAIExposure == null || score.currentAIAdoption == null) {
    return "unscored";
  }
  if (score.scoringModel?.startsWith("fixture/")) return "fixture";
  return "llm";
}

export function mergeOccupations(args: {
  occupations: ParsedOccupation[];
  employment: EmploymentRow[];
  outlook: OutlookRecord[];
  scores: ScoreRecord[];
}): Occupation[] {
  const employmentMap = employmentByExactCode(args.employment);
  const outlookMap = new Map(args.outlook.map((row) => [row.occupationCode, row]));
  const scoreMap = new Map(args.scores.map((row) => [row.occupationCode, row]));

  return args.occupations.map((occ) => {
    const employment = employmentMap.get(occ.occupationCode);
    const outlook = outlookMap.get(occ.occupationCode);
    const score = scoreMap.get(occ.occupationCode);
    const status = scoreStatusOf(score);

    return occupationSchema.parse({
      occupationCode: occ.occupationCode,
      occupationNameFi: occ.occupationNameFi,
      occupationNameSv: occ.occupationNameSv,
      occupationNameEn: occ.occupationNameEn,
      majorGroupCode: occ.majorGroupCode,
      majorGroupName: occ.majorGroupName,
      description: occ.description,
      employedPersons: employment?.employedPersons ?? null,
      employmentDataYear: employment ? employment.year : null,
      laborMarketOutlook: outlook?.laborMarketOutlook ?? "unavailable",
      shortageSurplusIndex: outlook?.shortageSurplusIndex ?? null,
      outlookSource:
        outlook?.outlookSource ??
        `Ei koneluettavaa Työvoimabarometri-havaintoa tälle AML-koodille. Haettu ${RETRIEVED_AT}.`,
      theoreticalAIExposure: score?.theoreticalAIExposure ?? null,
      currentAIAdoption: score?.currentAIAdoption ?? null,
      exposureRationale: score?.exposureRationale ?? null,
      adoptionRationale: score?.adoptionRationale ?? null,
      humanCriticalTasks: score?.humanCriticalTasks ?? [],
      AIApplicableTasks: score?.AIApplicableTasks ?? [],
      uncertainty: score?.uncertainty ?? null,
      sourceUrls: occ.sourceUrls,
      scoredAt: score?.scoredAt ?? null,
      scoringModel: score?.scoringModel ?? null,
      promptVersion: score?.promptVersion ?? null,
      level: occ.level,
      nameFallbackSv: occ.nameFallbackSv,
      nameFallbackEn: occ.nameFallbackEn,
      descriptionAvailable: occ.descriptionAvailable,
      employmentStale: employment ? employment.year < 2024 : true,
      outlookStale: outlook?.outlookStale ?? true,
      scoreStatus: status,
    });
  });
}

export function isFixtureModel(model: string | null | undefined): boolean {
  return Boolean(model?.startsWith("fixture/") || model === FIXTURE_MODEL);
}

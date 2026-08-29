import { isUnclassifiedOccupation } from "../occupation-view";
import type { Occupation } from "../schemas/occupation";
import {
  catalogCoverageReportSchema,
  coverageReportSchema,
  type CatalogCoverageReport,
  type CoverageField,
  type CoverageReport,
} from "../schemas/coverage";
import { qualificationSkills } from "../skills/overlap";
import { skillsFromOccupation } from "../skills/normalize";
import {
  ANALYSIS_SCORE_STALE_MS,
  COVERAGE_BRIDGES_MIN,
  COVERAGE_FIELD_WEIGHTS,
  COVERAGE_SITUATION_MIN,
} from "../scoring/weights";

function field(
  status: CoverageField["status"],
  kind: CoverageField["kind"],
  stale = false,
): CoverageField {
  return { status, kind, stale };
}

function completenessOf(fields: CoverageReport["fields"]): number {
  const score = (item: CoverageField, inferredOk = false): number => {
    if (item.status === "present") return 1;
    if (item.status === "stale") return 0.55;
    if (item.status === "fixture") return 0.7;
    if (item.status === "inferred_from_tasks") return inferredOk ? 0.45 : 0.45;
    return 0;
  };
  return Number(
    (
      COVERAGE_FIELD_WEIGHTS.officialEmployment * score(fields.officialEmployment) +
      COVERAGE_FIELD_WEIGHTS.officialOutlook * score(fields.officialOutlook) +
      COVERAGE_FIELD_WEIGHTS.officialDescription * score(fields.officialDescription) +
      COVERAGE_FIELD_WEIGHTS.aiScores * score(fields.aiScores) +
      COVERAGE_FIELD_WEIGHTS.tasks * score(fields.tasks) +
      COVERAGE_FIELD_WEIGHTS.skills * score(fields.skills, true) +
      COVERAGE_FIELD_WEIGHTS.qualifications * score(fields.qualifications) +
      COVERAGE_FIELD_WEIGHTS.humanCritical * score(fields.humanCritical)
    ).toFixed(3),
  );
}

export function isAnalysisStale(occupation: Occupation, now = new Date()): boolean {
  if (occupation.employmentStale || occupation.outlookStale) return true;
  if (!occupation.scoredAt) return occupation.scoreStatus === "unscored";
  const scored = Date.parse(occupation.scoredAt);
  if (Number.isNaN(scored)) return true;
  return now.getTime() - scored > ANALYSIS_SCORE_STALE_MS;
}

export function buildCoverageReport(occupation: Occupation, now = new Date()): CoverageReport {
  const skills = skillsFromOccupation(occupation);
  const explicit = skills.filter((item) => item.source === "explicit_skill" && !item.generic);
  const inferred = skills.filter((item) => item.source === "normalized_task" && !item.generic);
  const quals = qualificationSkills(skills);
  const hasTasks = occupation.AIApplicableTasks.length + occupation.humanCriticalTasks.length > 0;

  const officialEmployment: CoverageField =
    occupation.employedPersons == null
      ? field("unavailable", "unavailable")
      : occupation.employmentStale
        ? field("stale", "official", true)
        : field("present", "official");

  const officialOutlook: CoverageField =
    occupation.laborMarketOutlook === "unavailable"
      ? field("unavailable", "unavailable")
      : occupation.outlookStale
        ? field("stale", "official", true)
        : field("present", "official");

  const officialDescription: CoverageField = occupation.descriptionAvailable
    ? field("present", "official")
    : field("unavailable", "unavailable");

  const aiScores: CoverageField =
    occupation.scoreStatus === "unscored" || occupation.theoreticalAIExposure == null
      ? field("missing", "unavailable")
      : occupation.scoreStatus === "fixture"
        ? field("fixture", "ai_estimate")
        : field("present", "ai_estimate");

  const tasks: CoverageField = hasTasks ? field("present", "ai_estimate") : field("missing", "unavailable");

  const skillsField: CoverageField = explicit.length
    ? field("present", "ai_estimate")
    : inferred.length
      ? field("inferred_from_tasks", "ai_estimate")
      : field("missing", "unavailable");

  const qualifications: CoverageField = quals.length
    ? field("present", "official")
    : field("unavailable", "unavailable");

  const humanCritical: CoverageField = occupation.humanCriticalTasks.length
    ? field("present", "ai_estimate")
    : field("missing", "unavailable");

  const fields = {
    officialEmployment,
    officialOutlook,
    officialDescription,
    aiScores,
    tasks,
    skills: skillsField,
    qualifications,
    humanCritical,
  };

  const missingEvidence: string[] = [];
  if (officialEmployment.status === "unavailable") missingEvidence.push("officialEmployment");
  if (officialEmployment.stale) missingEvidence.push("employmentCurrentYear");
  if (officialOutlook.status === "unavailable") missingEvidence.push("officialOutlook");
  if (officialDescription.status === "unavailable") missingEvidence.push("officialDescription");
  if (aiScores.status === "missing") missingEvidence.push("aiScores");
  if (tasks.status === "missing") missingEvidence.push("taskList");
  if (skillsField.status === "missing") missingEvidence.push("explicitSkills");
  if (skillsField.status === "inferred_from_tasks") missingEvidence.push("explicitSkills");
  if (qualifications.status === "unavailable") missingEvidence.push("formalQualifications");
  if (humanCritical.status === "missing") missingEvidence.push("humanCriticalTasks");
  if (occupation.uncertainty === "high") missingEvidence.push("lowUncertainty");

  const completeness = completenessOf(fields);
  return coverageReportSchema.parse({
    occupationCode: occupation.occupationCode,
    completeness,
    fields,
    missingEvidence,
    sufficientForBridges: completeness >= COVERAGE_BRIDGES_MIN && hasTasks,
    sufficientForSituation: completeness >= COVERAGE_SITUATION_MIN && hasTasks,
    analysisStale: isAnalysisStale(occupation, now),
    inventedOfficialStats: false,
  });
}

export function buildCatalogCoverageReport(occupations: Occupation[]): CatalogCoverageReport {
  const visual = occupations.filter((row) => row.level === 4 && !isUnclassifiedOccupation(row));
  const scored = occupations.filter((row) => row.scoreStatus !== "unscored");
  const fixture = occupations.filter((row) => row.scoreStatus === "fixture");
  const llm = occupations.filter((row) => row.scoreStatus === "llm");
  const level4 = occupations.filter((row) => row.level === 4);
  const withEmployment = level4.filter((row) => row.employedPersons != null);
  const withOutlook = level4.filter((row) => row.laborMarketOutlook !== "unavailable");
  const withTasks = visual.filter((row) => row.AIApplicableTasks.length + row.humanCriticalTasks.length > 0);
  const withExplicitSkills = visual.filter((row) => (row.recommendedSkills ?? []).length > 0);
  const withAnySkills = visual.filter((row) => skillsFromOccupation(row).some((item) => !item.generic));

  const inventedOfficialStats = occupations.some(
    (row) =>
      (row.employedPersons != null && row.employmentDataYear == null) ||
      (row.laborMarketOutlook !== "unavailable" && !row.outlookSource),
  );
  const fullCatalogFakeScores =
    visual.length > 0 &&
    fixture.length === visual.length &&
    llm.length === 0 &&
    visual.every((row) => row.scoreStatus === "fixture");

  const errors: string[] = [];
  const warnings: string[] = [];
  if (inventedOfficialStats) errors.push("invented_official_stats");
  if (fullCatalogFakeScores) errors.push("full_catalog_fake_scores");
  if (fixture.some((row) => !row.scoringModel?.startsWith("fixture/"))) {
    errors.push("unlabelled_fixture_scores");
  }
  if (withEmployment.length < level4.length * 0.5) {
    warnings.push("low_employment_coverage");
  }

  return catalogCoverageReportSchema.parse({
    generatedAt: new Date().toISOString(),
    occupationCount: occupations.length,
    visualLevel4Count: visual.length,
    scoredCount: scored.length,
    fixtureScoreCount: fixture.length,
    llmScoreCount: llm.length,
    unscoredCount: occupations.filter((row) => row.scoreStatus === "unscored").length,
    employmentCoverage: level4.length ? withEmployment.length / level4.length : 0,
    outlookCoverage: level4.length ? withOutlook.length / level4.length : 0,
    skillCoverage: visual.length ? withAnySkills.length / visual.length : 0,
    taskCoverage: visual.length ? withTasks.length / visual.length : 0,
    explicitSkillCoverage: visual.length ? withExplicitSkills.length / visual.length : 0,
    fullCatalogFakeScores,
    inventedOfficialStats,
    missingOfficialCount: level4.length - withEmployment.length + level4.length - withOutlook.length,
    errors,
    warnings,
    ok: errors.length === 0,
  });
}

import { buildCareerBridges, type AnalysisLocale } from "../bridges";
import { buildCoverageReport } from "../coverage/report";
import type { CareerBridgesResponse } from "../schemas/bridges";
import type { Occupation } from "../schemas/occupation";
import type { WorkdayResponse } from "../schemas/workday";
import {
  situationAssessmentSchema,
  type RecommendationCategory,
  type SituationAssessment,
  type SituationSignal,
} from "../schemas/situation";
import { OVERLAP_SKILL_CATEGORIES } from "../schemas/skills";
import { SITUATION_ACCELERATE_SHARE_MIN, SITUATION_HIGH_EXPOSURE_MIN } from "../scoring/weights";
import { skillLabel, skillsFromOccupation } from "../skills/normalize";
import { evidenceLabel, signalDetail, situationSummary } from "./copy";

function accelerateShare(occupation: Occupation, workday?: WorkdayResponse | null): number | null {
  if (workday?.accelerateShare) {
    return (workday.accelerateShare.low + workday.accelerateShare.high) / 2;
  }
  const accelerate = occupation.AIApplicableTasks.length;
  const human = occupation.humanCriticalTasks.length;
  const total = accelerate + human;
  if (!total) return null;
  return accelerate / total;
}

export function assessSituation(args: {
  occupation: Occupation;
  catalog: Occupation[];
  locale: AnalysisLocale;
  workday?: WorkdayResponse | null;
  now?: Date;
  bridges?: CareerBridgesResponse;
}): SituationAssessment {
  const { occupation, catalog, locale, workday, now } = args;
  const coverage = buildCoverageReport(occupation, now);
  const bridges = args.bridges ?? buildCareerBridges(occupation, catalog, locale);
  const skills = skillsFromOccupation(occupation, workday?.recommendedSkills ?? [], "user_workday");
  const transferableLabels = skills
    .filter((skill) => OVERLAP_SKILL_CATEGORIES.includes(skill.category) && !skill.generic)
    .map((skill) => skillLabel(skill, locale));
  const share = accelerateShare(occupation, workday);
  const highTask =
    (share != null && share >= SITUATION_ACCELERATE_SHARE_MIN) ||
    (occupation.theoreticalAIExposure != null &&
      occupation.theoreticalAIExposure >= SITUATION_HIGH_EXPOSURE_MIN &&
      occupation.AIApplicableTasks.length > 0);
  const outlookKnown = occupation.laborMarketOutlook !== "unavailable";
  const weakOutlook =
    occupation.laborMarketOutlook === "surplus" || occupation.laborMarketOutlook === "mismatch";
  const strongTransfer = bridges.bridges.some((row) => row.factors.transferableSkillOverlap >= 0.35);
  const sufficient = coverage.sufficientForSituation;

  const signals: SituationSignal[] = [
    {
      id: "highRecurringTaskExposure",
      present: highTask,
      kind: share != null || occupation.theoreticalAIExposure != null ? "ai_estimate" : "unavailable",
      detail: signalDetail(locale, "highRecurringTaskExposure", highTask),
    },
    {
      id: "weakOfficialOutlook",
      present: weakOutlook,
      kind: outlookKnown ? "official" : "unavailable",
      detail: signalDetail(locale, "weakOfficialOutlook", weakOutlook),
    },
    {
      id: "strongTransferableOverlap",
      present: strongTransfer,
      kind: strongTransfer ? "calculated" : "unavailable",
      detail: signalDetail(locale, "strongTransferableOverlap", strongTransfer),
    },
    {
      id: "sufficientData",
      present: sufficient,
      kind: sufficient ? "calculated" : "unavailable",
      detail: signalDetail(locale, "sufficientData", sufficient),
    },
  ];

  const contentSignals = [highTask, weakOutlook, strongTransfer].filter(Boolean).length;
  const derivedFromExposureAlone = highTask && !weakOutlook && !strongTransfer;
  let category: RecommendationCategory;
  if (!sufficient) {
    category = "insufficient_evidence";
  } else if (highTask && (weakOutlook || strongTransfer) && contentSignals >= 2) {
    category = "explore_adjacent_now";
  } else if (
    occupation.uncertainty === "high" ||
    coverage.analysisStale ||
    coverage.fields.skills.status === "inferred_from_tasks" ||
    derivedFromExposureAlone
  ) {
    category = derivedFromExposureAlone && occupation.laborMarketOutlook === "shortage"
      ? "strengthen_current_role"
      : "document_and_verify";
  } else {
    category = "strengthen_current_role";
  }

  if (category === "explore_adjacent_now" && derivedFromExposureAlone) {
    category = "document_and_verify";
  }

  const why = signals.filter((signal) => signal.present).map((signal) => signal.detail);
  if (!why.length) {
    why.push(signalDetail(locale, "sufficientData", sufficient));
  }
  why.push(
    locale === "en"
      ? "AI exposure is not a probability of unemployment, and a career change is not derived from exposure alone."
      : locale === "sv"
        ? "AI-exponering är inte en arbetslöshetssannolikhet, och ett yrkesbyte härleds inte från exponering ensam."
        : "AI-altistus ei ole työttömyyden todennäköisyys, eikä uranvaihtoa johdeta altistuksesta yksin.",
  );

  return situationAssessmentSchema.parse({
    category,
    summary: situationSummary(locale, category, {
      transferableLabels,
      weakOutlook,
      outlookMissing: !outlookKnown,
    }),
    why,
    missingEvidence: coverage.missingEvidence.map((key) => evidenceLabel(locale, key)),
    signals,
    independentSignalCount: contentSignals,
    derivedFromExposureAlone,
    locale,
  });
}

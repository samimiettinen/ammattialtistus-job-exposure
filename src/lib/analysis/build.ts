import { buildCareerBridges, type AnalysisLocale } from "../bridges";
import { buildCoverageReport } from "../coverage/report";
import type { Occupation } from "../schemas/occupation";
import { occupationAnalysisSchema, type OccupationAnalysis, type ValuableCapability } from "../schemas/situation";
import type { WorkdayResponse } from "../schemas/workday";
import type { CareerBridgesResponse } from "../schemas/bridges";
import { OVERLAP_SKILL_CATEGORIES } from "../schemas/skills";
import { skillLabel, skillsFromOccupation } from "../skills/normalize";
import { assessSituation } from "../situation/assess";
import { buildNextActions } from "../situation/actions";

export type BuiltAnalysis = OccupationAnalysis & {
  bridges: CareerBridgesResponse;
};

export function buildOccupationAnalysis(args: {
  occupation: Occupation;
  catalog: Occupation[];
  locale: AnalysisLocale;
  workday?: WorkdayResponse | null;
  now?: Date;
}): BuiltAnalysis {
  const { occupation, catalog, locale, workday, now } = args;
  const coverage = buildCoverageReport(occupation, now);
  const bridges = buildCareerBridges(occupation, catalog, locale);
  const situation = assessSituation({ occupation, catalog, locale, workday, now, bridges });
  const classifiedSkills = skillsFromOccupation(occupation, workday?.recommendedSkills ?? [], "user_workday");
  const capabilities: ValuableCapability[] = classifiedSkills
    .filter((skill) => !skill.generic && OVERLAP_SKILL_CATEGORIES.includes(skill.category))
    .slice(0, 6)
    .map((skill) => ({
      skill,
      why:
        locale === "en"
          ? `${skillLabel(skill, locale)} is retained as a transferable capability (calculated overlap, ${skill.source}).`
          : locale === "sv"
            ? `${skillLabel(skill, locale)} behålls som överförbar förmåga (beräknad överlappning, ${skill.source}).`
            : `${skillLabel(skill, locale)} säilyy siirtokelpoisena kykynä (laskettu päällekkäisyys, ${skill.source}).`,
    }));
  const actions = buildNextActions({
    occupation,
    locale,
    situation,
    bridges: bridges.bridges,
    workday,
  });
  const analysis = occupationAnalysisSchema.parse({
    occupationCode: occupation.occupationCode,
    locale,
    coverage,
    situation,
    capabilities,
    classifiedSkills,
    actions,
    analysisStale: coverage.analysisStale,
  });
  return { ...analysis, bridges };
}

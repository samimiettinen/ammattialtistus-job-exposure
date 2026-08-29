import { occupationSchema, type Occupation, type ValidationReport } from "../schemas";

export function validateOccupations(occupations: Occupation[]): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const codes = occupations.map((row) => row.occupationCode);
  const unique = new Set(codes).size === codes.length;
  if (!unique) errors.push("Occupation codes are not unique.");

  for (const row of occupations) {
    const parsed = occupationSchema.safeParse(row);
    if (!parsed.success) {
      errors.push(`${row.occupationCode}: ${parsed.error.message}`);
    }
    if (row.level === 4 && !row.majorGroupCode) {
      errors.push(`${row.occupationCode}: missing major group`);
    }
    if (row.theoreticalAIExposure != null && (row.theoreticalAIExposure < 0 || row.theoreticalAIExposure > 10)) {
      errors.push(`${row.occupationCode}: exposure out of range`);
    }
    if (row.currentAIAdoption != null && (row.currentAIAdoption < 0 || row.currentAIAdoption > 10)) {
      errors.push(`${row.occupationCode}: adoption out of range`);
    }
  }

  const level4 = occupations.filter((row) => row.level === 4);
  const withEmployment = level4.filter((row) => row.employedPersons != null);
  const withOutlook = level4.filter((row) => row.laborMarketOutlook !== "unavailable");
  const scored = occupations.filter((row) => row.scoreStatus !== "unscored");

  if (withEmployment.length < level4.length * 0.5) {
    warnings.push("Fewer than half of level-4 occupations have employment counts.");
  }

  return {
    ok: errors.length === 0,
    generatedAt: new Date().toISOString(),
    occupationCount: occupations.length,
    uniqueCodes: unique,
    scoredCount: scored.length,
    fixtureScoreCount: occupations.filter((row) => row.scoreStatus === "fixture").length,
    llmScoreCount: occupations.filter((row) => row.scoreStatus === "llm").length,
    unscoredCount: occupations.filter((row) => row.scoreStatus === "unscored").length,
    employmentCoverage: level4.length ? withEmployment.length / level4.length : 0,
    outlookCoverage: level4.length ? withOutlook.length / level4.length : 0,
    errors,
    warnings,
  };
}

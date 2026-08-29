import type { Occupation, OccupationQuery } from "../schemas";

export function occupationSearchText(occupation: Occupation): string {
  return [
    occupation.occupationCode,
    occupation.occupationNameFi,
    occupation.occupationNameSv,
    occupation.occupationNameEn,
    occupation.majorGroupName,
  ]
    .join(" ")
    .toLocaleLowerCase("fi");
}

export function filterOccupations(
  occupations: Occupation[],
  query: OccupationQuery,
): Occupation[] {
  const needle = query.q?.trim().toLocaleLowerCase("fi");
  return occupations.filter((occupation) => {
    if (query.level != null && occupation.level !== query.level) return false;
    if (query.code && occupation.occupationCode !== query.code) return false;
    if (query.group && occupation.majorGroupCode !== query.group) return false;
    if (query.outlook && occupation.laborMarketOutlook !== query.outlook) return false;
    if (query.scoreStatus === "scored" && occupation.scoreStatus === "unscored") return false;
    if (
      query.scoreStatus &&
      query.scoreStatus !== "scored" &&
      occupation.scoreStatus !== query.scoreStatus
    ) {
      return false;
    }
    if (query.minEmployment != null && (occupation.employedPersons ?? -1) < query.minEmployment) {
      return false;
    }
    if (query.maxEmployment != null && (occupation.employedPersons ?? Number.POSITIVE_INFINITY) > query.maxEmployment) {
      return false;
    }
    if (query.minExposure != null && (occupation.theoreticalAIExposure ?? -1) < query.minExposure) {
      return false;
    }
    if (query.maxExposure != null && (occupation.theoreticalAIExposure ?? 99) > query.maxExposure) {
      return false;
    }
    if (query.minAdoption != null && (occupation.currentAIAdoption ?? -1) < query.minAdoption) {
      return false;
    }
    if (query.maxAdoption != null && (occupation.currentAIAdoption ?? 99) > query.maxAdoption) {
      return false;
    }
    if (needle && !occupationSearchText(occupation).includes(needle)) return false;
    return true;
  });
}

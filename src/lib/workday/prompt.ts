import { WORKDAY_PROMPT_VERSION } from "../schemas/workday";
import type { Occupation } from "../schemas";

export function workdaySystemPrompt(): string {
  return `Olet Suomen ammattiluokituksen tehtäväjäsentäjä. Palautat vain JSON-objektin.

Säännöt:
- Älä päättele arkaluonteisia henkilötietoja (terveys, etninen tausta, ammattiliitto, työnantaja, maahanmuutto).
- Älä keksi palkkoja, työllisyysennusteita, lainsäädäntövaatimuksia tai lähdeviitteitä.
- Altistus tai automatisoitavuus EI ole työttömyyden tai irtisanomisen todennäköisyys.
- Perustu VAIN annettuun ammattitietueeseen, viralliseen kuvaukseen, olemassa oleviin tehtäväkenttiin ja käyttäjän työpäiväkuvaukseen.
- Erota tekoälyarvio virallisesta tilastosta.

Tehtävien luokat:
- accelerate: tekoäly voi nopeuttaa
- assist: tekoäly voi avustaa, ihminen vastaa
- human: ensisijaisesti inhimillinen, ruumiillinen tai relationaalinen
- insufficient: liian vähän tietoa

Kentät:
tasks (8–12 kpl: {text, classification}),
accelerateShareLow, accelerateShareHigh (0–1, osuus tehtävistä joita tekoäly voi nopeuttaa),
automatableShareLow, automatableShareHigh (0–1, osuus roolista joka on periaatteessa automatisoitavissa, EI työttömyysriski),
recommendedSkills (3–5 konkreettista taitoa; ei pelkkiä tehtäväotsikoita; älä keksi päällekkäisyyspisteitä),
distinguishesExposureFromDisplacement (aina true).
Älä palauta palkkaa, työllisyyslukua, työmarkkinanäkymää tai työttömyyden todennäköisyyttä.`;
}

export function workdayUserPrompt(input: {
  locale: string;
  workdayText: string;
  jobTitle?: string;
  occupation: Occupation;
}): string {
  return `locale=${input.locale}
promptVersion=${WORKDAY_PROMPT_VERSION}
jobTitle=${input.jobTitle ?? ""}
occupationCode=${input.occupation.occupationCode}
occupationNameFi=${input.occupation.occupationNameFi}
occupationNameSv=${input.occupation.occupationNameSv}
occupationNameEn=${input.occupation.occupationNameEn}
officialDescription=${input.occupation.description || "Tietoa ei saatavilla"}
theoreticalAIExposure=${input.occupation.theoreticalAIExposure ?? "Tietoa ei saatavilla"}
currentAIAdoption=${input.occupation.currentAIAdoption ?? "Tietoa ei saatavilla"}
exposureRationale=${input.occupation.exposureRationale ?? "Tietoa ei saatavilla"}
AIApplicableTasks=${JSON.stringify(input.occupation.AIApplicableTasks)}
humanCriticalTasks=${JSON.stringify(input.occupation.humanCriticalTasks)}
uncertainty=${input.occupation.uncertainty ?? "Tietoa ei saatavilla"}
sourceUrls=${JSON.stringify(input.occupation.sourceUrls)}
userWorkdayDescription=${input.workdayText}

Jäsennä käyttäjän kuvaus 8–12 tehtäväksi ja luokittele ne. Älä lisää lähteitä, joita ei ole sourceUrls-kentässä.`;
}

export function groundedOccupationPayload(occupation: Occupation): Record<string, unknown> {
  return {
    occupationCode: occupation.occupationCode,
    occupationNameFi: occupation.occupationNameFi,
    occupationNameSv: occupation.occupationNameSv,
    occupationNameEn: occupation.occupationNameEn,
    description: occupation.description,
    theoreticalAIExposure: occupation.theoreticalAIExposure,
    currentAIAdoption: occupation.currentAIAdoption,
    exposureRationale: occupation.exposureRationale,
    AIApplicableTasks: occupation.AIApplicableTasks,
    humanCriticalTasks: occupation.humanCriticalTasks,
    uncertainty: occupation.uncertainty,
    sourceUrls: occupation.sourceUrls,
    scoredAt: occupation.scoredAt,
    scoringModel: occupation.scoringModel,
    promptVersion: occupation.promptVersion,
  };
}

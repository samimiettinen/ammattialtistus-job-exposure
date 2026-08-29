import type { CareerBridge } from "../schemas/bridges";
import type { Occupation } from "../schemas/occupation";
import type { NextAction } from "../schemas/situation";
import type { WorkdayResponse } from "../schemas/workday";
import { NEXT_ACTION_LIMIT } from "../scoring/weights";
import { skillLabel } from "../skills/normalize";
import { evidenceLabel, unavailableLabel } from "./copy";
import type { AnalysisLocale } from "../bridges";
import type { SituationAssessment } from "../schemas/situation";

function firstAccelerateTask(occupation: Occupation, workday?: WorkdayResponse | null): string | null {
  const fromWorkday = workday?.tasks.find((task) => task.classification === "accelerate")?.text;
  if (fromWorkday) return fromWorkday;
  return occupation.AIApplicableTasks[0] ?? null;
}

export function buildNextActions(args: {
  occupation: Occupation;
  locale: AnalysisLocale;
  situation: SituationAssessment;
  bridges: CareerBridge[];
  workday?: WorkdayResponse | null;
}): NextAction[] {
  const { occupation, locale, situation, bridges, workday } = args;
  const unavailable = unavailableLabel(locale);
  const neighbour = bridges[0] ?? null;
  const missingSpecific = neighbour?.missingOccupationSpecific[0] ?? null;
  const accelerateTask = firstAccelerateTask(occupation, workday);
  const actions: NextAction[] = [];

  const t = {
    fi: {
      testTitle: "Kokeile tekoälyä yhdessä raportointi- tai luonnostehtävässä",
      testDetail: (task: string) =>
        `Valitse yksi toistuva tehtävä (${task}) ja mittaa aika ennen ja jälkeen. Tämä ei ole ura- tai irtisanomispäätös.`,
      testWhy: "Tehtävätasolla on merkitty tekoälylle soveltuva työ, joten kokeilu voidaan rajata yhteen tehtävään.",
      interviewTitle: "Haastattele yhtä henkilöä läheisessä ammatissa",
      interviewDetail: (name: string, code: string) =>
        `Sovi yksi keskustelu ammatissa ${code} ${name}. Kysy kelpoisuudesta, arjen tehtävistä ja siitä, mitä nykyisestä työstä siirtyy.`,
      interviewWhy: "Läheinen ammatti nousi lasketusta päällekkäisyydestä, ei nimikkeen samankaltaisuudesta.",
      introTitle: "Yksi lyhyt johdanto puuttuvaan taitoon",
      introDetail: (skill: string) =>
        `Varaa yksi lyhyt johdantomoduuli taitoon “${skill}”. Tämä ei ole väite nopeasta uudelleenkoulutuksesta.`,
      introWhy: "Läheisessä roolissa on dokumentoitu ammatti- tai välineosaaminen, jota nykyisessä listassa ei ole.",
      coordTitle: "Kirjaa yhden viikon piilevä koordinointi",
      coordDetail:
        "Kirjaa viikon ajan piilokoordinointi, laadunvarmistus ja asiakasrajapinta. Näin taitolista ei jää pelkäksi tehtäväotsikoksi.",
      coordWhy: "Taitoja on jouduttu päättelemään tehtävistä, tai ihmisen vastuulle kuuluva koordinointi on keskeinen.",
      qualTitle: "Vertaa kahden läheisen ammatin virallisia kelpoisuusvaatimuksia",
      qualDetail: (a: string, b: string) =>
        `Avaa AML-kuvaukset ${a} ja ${b} ja kirjaa, onko kelpoisuus mainittu. Jos ei, merkitse: ${unavailable}.`,
      qualWhy: "Kelpoisuusero vaikuttaa siirtymään, mutta virallista vaatimusta ei saa keksiä.",
    },
    sv: {
      testTitle: "Prova AI på en rapporterings- eller utkastuppgift",
      testDetail: (task: string) =>
        `Välj en återkommande uppgift (${task}) och mät tiden före och efter. Detta är inte ett karriär- eller uppsägningsbeslut.`,
      testWhy: "På uppgiftsnivå finns AI-tillämpligt arbete, så försöket kan begränsas till en uppgift.",
      interviewTitle: "Intervjua en person i ett närliggande yrke",
      interviewDetail: (name: string, code: string) =>
        `Boka ett samtal i yrket ${code} ${name}. Fråga om behörighet, vardagsuppgifter och vad som överförs från nuvarande arbete.`,
      interviewWhy: "Det närliggande yrket kom från beräknad överlappning, inte från liknande titel.",
      introTitle: "En kort introduktion till en saknad färdighet",
      introDetail: (skill: string) =>
        `Boka en kort introduktionsmodul för “${skill}”. Detta är inte ett påstående om snabb omskolning.`,
      introWhy: "I den närliggande rollen finns yrkes- eller verktygskunskap som saknas i den nuvarande listan.",
      coordTitle: "Dokumentera en veckas dold samordning",
      coordDetail:
        "Anteckna en vecka dold samordning, kvalitetssäkring och kundgränssnitt så att färdighetslistan inte stannar vid uppgiftsetiketter.",
      coordWhy: "Färdigheter har härletts från uppgifter, eller mänsklig samordning är central.",
      qualTitle: "Jämför officiella behörighetskrav för två närliggande yrken",
      qualDetail: (a: string, b: string) =>
        `Öppna AML-beskrivningarna ${a} och ${b} och notera om behörighet nämns. Annars: ${unavailable}.`,
      qualWhy: "Behörighetsskillnaden påverkar övergången, men kravet får inte hittas på.",
    },
    en: {
      testTitle: "Test AI on one reporting or drafting task",
      testDetail: (task: string) =>
        `Pick one recurring task (${task}) and measure time before and after. This is not a career or dismissal decision.`,
      testWhy: "The task list marks AI-applicable work, so the trial can be limited to a single task.",
      interviewTitle: "Interview one person in an adjacent occupation",
      interviewDetail: (name: string, code: string) =>
        `Arrange one conversation in occupation ${code} ${name}. Ask about qualifications, daily tasks, and what transfers from the current role.`,
      interviewWhy: "The adjacent occupation came from calculated overlap, not from a similar title.",
      introTitle: "One short introductory module for a missing skill",
      introDetail: (skill: string) =>
        `Schedule one short introductory module for “${skill}”. This is not a claim of rapid reskilling.`,
      introWhy: "The adjacent role has occupation-specific or tool expertise that is missing from the current list.",
      coordTitle: "Document one week of hidden coordination",
      coordDetail:
        "For one week, record hidden coordination, quality assurance and client interface work so skills are not only task labels.",
      coordWhy: "Skills were inferred from tasks, or human coordination is central to the role.",
      qualTitle: "Compare official qualification requirements of two adjacent roles",
      qualDetail: (a: string, b: string) =>
        `Open the AML descriptions for ${a} and ${b} and note whether a qualification is stated. If not, record: ${unavailable}.`,
      qualWhy: "Qualification distance affects a move, but a requirement must not be invented.",
    },
  }[locale];

  if (accelerateTask) {
    actions.push({
      id: "test_ai_on_task",
      kind: "test_ai_on_task",
      title: t.testTitle,
      detail: t.testDetail(accelerateTask),
      why: t.testWhy,
      missingEvidence: situation.missingEvidence.slice(0, 2),
      connectedTo: "tasks.accelerate",
      testable: true,
    });
  }

  if (neighbour) {
    const name =
      locale === "sv"
        ? neighbour.occupationNameSv
        : locale === "en"
          ? neighbour.occupationNameEn
          : neighbour.occupationNameFi;
    actions.push({
      id: "interview_adjacent",
      kind: "interview_adjacent",
      title: t.interviewTitle,
      detail: t.interviewDetail(name, neighbour.occupationCode),
      why: t.interviewWhy,
      missingEvidence: neighbour.missingEvidence.map((key) => evidenceLabel(locale, key)).slice(0, 2),
      connectedTo: `bridges.${neighbour.occupationCode}`,
      testable: true,
    });
  }

  if (missingSpecific && actions.length < NEXT_ACTION_LIMIT) {
    actions.push({
      id: "short_intro_module",
      kind: "short_intro_module",
      title: t.introTitle,
      detail: t.introDetail(skillLabel(missingSpecific, locale)),
      why: t.introWhy,
      missingEvidence: [evidenceLabel(locale, "explicitSkills")],
      connectedTo: `skills.missing.${missingSpecific.id}`,
      testable: true,
    });
  }

  const needsCoordination =
    occupation.humanCriticalTasks.some((item) => /koord|laadu|asiakas|samord|coordin|quality/i.test(item)) ||
    situation.category === "document_and_verify" ||
    situation.missingEvidence.some((item) => /tait|skill|färdig/i.test(item));
  if (needsCoordination && actions.length < NEXT_ACTION_LIMIT && !actions.some((item) => item.kind === "document_coordination")) {
    actions.push({
      id: "document_coordination",
      kind: "document_coordination",
      title: t.coordTitle,
      detail: t.coordDetail,
      why: t.coordWhy,
      missingEvidence: [evidenceLabel(locale, "explicitSkills")],
      connectedTo: "skills.source",
      testable: true,
    });
  }

  if (neighbour && actions.length < NEXT_ACTION_LIMIT) {
    actions.push({
      id: "compare_qualifications",
      kind: "compare_qualifications",
      title: t.qualTitle,
      detail: t.qualDetail(occupation.occupationCode, neighbour.occupationCode),
      why: t.qualWhy,
      missingEvidence: neighbour.qualificationKnown ? [] : [evidenceLabel(locale, "formalQualifications")],
      connectedTo: "bridges.qualificationDistance",
      testable: true,
    });
  }

  return actions.slice(0, NEXT_ACTION_LIMIT);
}

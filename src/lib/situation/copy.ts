import type { AnalysisLocale } from "../bridges";
import type { RecommendationCategory } from "../schemas/situation";

const UNAVAILABLE = {
  fi: "Tietoa ei saatavilla",
  sv: "Uppgift saknas",
  en: "Information not available",
} as const;

export function unavailableLabel(locale: AnalysisLocale): string {
  return UNAVAILABLE[locale];
}

export function sourceKindLabel(
  locale: AnalysisLocale,
  kind: "official" | "ai_estimate" | "user_provided" | "unavailable" | "calculated",
): string {
  const table = {
    fi: {
      official: "Virallinen tilasto",
      ai_estimate: "Tekoälyn tuottama arvio",
      user_provided: "Käyttäjän antama tieto",
      unavailable: "Tietoa ei saatavilla",
      calculated: "Laskettu päällekkäisyys",
    },
    sv: {
      official: "Officiell statistik",
      ai_estimate: "AI-genererad uppskattning",
      user_provided: "Användaruppgift",
      unavailable: "Uppgift saknas",
      calculated: "Beräknad överlappning",
    },
    en: {
      official: "Official statistics",
      ai_estimate: "AI-generated estimate",
      user_provided: "User-provided information",
      unavailable: "Information not available",
      calculated: "Calculated overlap",
    },
  } as const;
  return table[locale][kind];
}

export function evidenceLabel(locale: AnalysisLocale, key: string): string {
  const map: Record<AnalysisLocale, Record<string, string>> = {
    fi: {
      officialEmployment: "Virallinen työllisyysluku",
      employmentCurrentYear: "Ajantasainen työllisyystilasto (tuorein vuosi 2023)",
      officialOutlook: "Virallinen työmarkkinanäkymä",
      officialDescription: "Virallinen ammattikuvaus",
      aiScores: "Tekoälypisteytys",
      taskList: "Tehtäväjako",
      explicitSkills: "Nimenomainen taitoluettelo (ei pelkkä tehtävälista)",
      formalQualifications: "Viralliset kelpoisuus- tai tutkintovaatimukset",
      humanCriticalTasks: "Ihmisen vastuulle kuuluvat tehtävät",
      lowUncertainty: "Matalampi arvioepävarmuus",
    },
    sv: {
      officialEmployment: "Officiellt sysselsättningstal",
      employmentCurrentYear: "Aktuell sysselsättningsstatistik (senaste år 2023)",
      officialOutlook: "Officiell arbetsmarknadsutsikt",
      officialDescription: "Officiell yrkesbeskrivning",
      aiScores: "AI-poängsättning",
      taskList: "Uppgiftsindelning",
      explicitSkills: "Uttrycklig färdighetslista (inte bara uppgifter)",
      formalQualifications: "Officiella behörighets- eller utbildningskrav",
      humanCriticalTasks: "Uppgifter med mänskligt ansvar",
      lowUncertainty: "Lägre osäkerhet i bedömningen",
    },
    en: {
      officialEmployment: "Official employment count",
      employmentCurrentYear: "Current employment statistics (latest year 2023)",
      officialOutlook: "Official labour-market outlook",
      officialDescription: "Official occupation description",
      aiScores: "AI scores",
      taskList: "Task breakdown",
      explicitSkills: "Explicit skill list (not task labels alone)",
      formalQualifications: "Official qualification or education requirements",
      humanCriticalTasks: "Human-critical tasks",
      lowUncertainty: "Lower assessment uncertainty",
    },
  };
  const bare = key.replace(/^(source|target)\./, "");
  const prefix =
    key.startsWith("target.")
      ? locale === "en"
        ? "Adjacent role: "
        : locale === "sv"
          ? "Närliggande yrke: "
          : "Läheinen ammatti: "
      : "";
  return `${prefix}${map[locale][bare] ?? bare}`;
}

const SUMMARIES: Record<RecommendationCategory, Record<AnalysisLocale, string>> = {
  explore_adjacent_now: {
    fi: "Rinnakkaisia uravaihtoehtoja kannattaa tarkastella jo nyt. Useat toistuvat tehtävät näyttävät vahvasti altistuneilta{outlook}. {skills} siirtyvät kuitenkin vahvasti alla merkittyihin läheisiin rooleihin.",
    sv: "Parallella karriäralternativ bör undersökas redan nu. Flera återkommande uppgifter ser starkt exponerade ut{outlook}. {skills} överförs dock tydligt till de närliggande rollerna nedan.",
    en: "Parallel career options should be explored now. Several recurring tasks appear highly exposed{outlook}. {skills} nevertheless transfer strongly to the adjacent roles shown below.",
  },
  strengthen_current_role: {
    fi: "Nykyisen roolin vahvistaminen on perusteltu seuraava askel. Altistus ei yksin oikeuta uranvaihtoa, ja dokumentoidut kyvyt ({skills}) ovat arvokkaita nykyisessä työssä.",
    sv: "Att stärka den nuvarande rollen är ett motiverat nästa steg. Exponering ensam motiverar inte ett yrkesbyte, och dokumenterade förmågor ({skills}) är värdefulla i det nuvarande arbetet.",
    en: "Strengthening the current role is a justified next step. Exposure alone does not warrant a career change, and the documented capabilities ({skills}) remain valuable in the present work.",
  },
  document_and_verify: {
    fi: "Ennen isoa urapäätöstä kannattaa täydentää näyttöä. Osa suosituksesta nojaa puutteelliseen tai vanhentuneeseen aineistoon, eikä altistus yksin tarkoita työpaikan katoamista.",
    sv: "Innan ett stort karriärbeslut bör underlaget kompletteras. Delar av bedömningen bygger på bristfälliga eller föråldrade uppgifter, och exponering betyder inte att jobbet försvinner.",
    en: "Before a major career decision, the evidence should be completed. Parts of this assessment rest on missing or stale inputs, and exposure does not mean the job will disappear.",
  },
  insufficient_evidence: {
    fi: "Aineisto ei riitä tilanteen arviointiin. Puuttuvat tiedot on merkitty alla; lukuja tai uraohjetta ei keksitä niiden tilalle.",
    sv: "Underlaget räcker inte för en lägesbedömning. Saknade uppgifter anges nedan; siffror eller karriärråd hittas inte på.",
    en: "The evidence is not sufficient for a situation assessment. Missing items are listed below; figures and career advice are not invented to fill the gaps.",
  },
};

export function situationSummary(
  locale: AnalysisLocale,
  category: RecommendationCategory,
  args: { transferableLabels: string[]; weakOutlook: boolean; outlookMissing: boolean },
): string {
  const skills =
    args.transferableLabels.slice(0, 3).join(locale === "en" ? ", " : ", ") ||
    (locale === "en" ? "documented capabilities" : locale === "sv" ? "dokumenterade förmågor" : "dokumentoidut kyvyt");
  const outlook = args.outlookMissing
    ? locale === "en"
      ? ", but official labour-market outlook is unavailable"
      : locale === "sv"
        ? ", men den officiella arbetsmarknadsutsikten saknas"
        : ", mutta virallista työmarkkinanäkymää ei ole saatavilla"
    : args.weakOutlook
      ? locale === "en"
        ? " and the available labour-market outlook is weak"
        : locale === "sv"
          ? " och den tillgängliga arbetsmarknadsutsikten är svag"
          : " ja saatavilla oleva työmarkkinanäkymä on heikko"
      : "";
  return SUMMARIES[category][locale].replace("{outlook}", outlook).replace("{skills}", skills);
}

export function signalDetail(
  locale: AnalysisLocale,
  id: "highRecurringTaskExposure" | "weakOfficialOutlook" | "strongTransferableOverlap" | "sufficientData",
  present: boolean,
): string {
  const rows = {
    fi: {
      highRecurringTaskExposure: present
        ? "Toistuvat tehtävät näyttävät vahvasti tekoälylle altistuneilta (tekoälyn tuottama arvio, ei työttömyyden todennäköisyys)."
        : "Toistuvien tehtävien altistus ei ole korkea tai tehtäväjako puuttuu.",
      weakOfficialOutlook: present
        ? "Virallinen työmarkkinanäkymä on ylitarjonta tai kohtaanto-ongelma."
        : "Virallinen näkymä ei ole heikko, tai tietoa ei saatavilla.",
      strongTransferableOverlap: present
        ? "Siirtokelpoiset taidot limittyvät vahvasti vähintään yhteen läheiseen ammattiin (laskettu, ei tekoälyn keksintö)."
        : "Vahvaa siirtokelpoista päällekkäisyyttä ei voitu laskea.",
      sufficientData: present ? "Aineisto riittää varovaiseen tilannearvioon." : "Aineisto ei riitä tilannearvioon.",
    },
    sv: {
      highRecurringTaskExposure: present
        ? "Återkommande uppgifter ser starkt AI-exponerade ut (AI-uppskattning, inte arbetslöshetssannolikhet)."
        : "Uppgifternas exponering är inte hög, eller uppgiftsindelning saknas.",
      weakOfficialOutlook: present
        ? "Den officiella arbetsmarknadsutsikten är överskott eller matchningsproblem."
        : "Den officiella utsikten är inte svag, eller uppgift saknas.",
      strongTransferableOverlap: present
        ? "Överförbara färdigheter överlappar tydligt minst ett närliggande yrke (beräknat)."
        : "Stark överförbar överlappning kunde inte beräknas.",
      sufficientData: present ? "Underlaget räcker för en försiktig lägesbedömning." : "Underlaget räcker inte.",
    },
    en: {
      highRecurringTaskExposure: present
        ? "Recurring tasks look highly AI-exposed (AI-generated estimate, not an unemployment probability)."
        : "Task-level exposure is not high, or the task list is missing.",
      weakOfficialOutlook: present
        ? "The official labour-market outlook is surplus or mismatch."
        : "The official outlook is not weak, or the figure is unavailable.",
      strongTransferableOverlap: present
        ? "Transferable skills overlap strongly with at least one adjacent occupation (calculated, not model-invented)."
        : "Strong transferable overlap could not be calculated.",
      sufficientData: present
        ? "The evidence is sufficient for a cautious situation assessment."
        : "The evidence is not sufficient for a situation assessment.",
    },
  } as const;
  return rows[locale][id];
}

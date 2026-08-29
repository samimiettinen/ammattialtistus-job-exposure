import type { SkillCategory, SkillLabels } from "../schemas/skills";

export type TaxonomyEntry = {
  id: string;
  category: SkillCategory;
  labels: SkillLabels;
  synonyms: string[];
};

export const GENERIC_SKILL_TOKENS = new Set([
  "tyo",
  "työ",
  "work",
  "jobb",
  "job",
  "taito",
  "taidot",
  "skill",
  "skills",
  "fardighet",
  "färdighet",
  "viestinta",
  "viestintä",
  "kommunikation",
  "communication",
  "vastuu",
  "ansvar",
  "responsibility",
  "tehtava",
  "tehtävä",
  "uppgift",
  "task",
  "yleinen",
  "general",
  "allman",
  "allmän",
  "tehtavakuvauksen tarkentaminen",
  "tehtäväkuvauksen tarkentaminen",
]);

export const SKILL_TAXONOMY: TaxonomyEntry[] = [
  {
    id: "documentation",
    category: "transferable",
    labels: { fi: "dokumentointi", sv: "dokumentation", en: "documentation" },
    synonyms: [
      "dokumentointi",
      "tekninen dokumentointi",
      "dokumentation",
      "documentation",
      "kirjaaminen",
      "kirjaamisen luonnos",
      "hoitokertomuksen luonnostelu",
      "kokousmuistiot",
      "luonnosmuistiot",
    ],
  },
  {
    id: "quality_assurance",
    category: "transferable",
    labels: { fi: "laadunvarmistus", sv: "kvalitetssäkring", en: "quality assurance" },
    synonyms: [
      "laadunvarmistus",
      "laadunvarmistus",
      "kvalitetssakring",
      "kvalitetssäkring",
      "quality assurance",
      "kayttoonottotarkastus",
      "käyttöönottotarkastus",
      "maarystarkistusten esihaku",
      "määräystarkistusten esihaku",
      "alv-tarkistukset",
    ],
  },
  {
    id: "coordination",
    category: "transferable",
    labels: { fi: "koordinointi", sv: "samordning", en: "coordination" },
    synonyms: [
      "koordinointi",
      "tiimityon koordinointi",
      "tiimityön koordinointi",
      "samordning",
      "coordination",
      "resursointi",
      "tyovuorosuunnittelun tuki",
      "työvuorosuunnittelun tuki",
      "vuorolistan hahmottelu",
      "vuorojen tasmays",
      "vuorojen täsmäys",
      "aikataulun hahmottelu",
    ],
  },
  {
    id: "client_understanding",
    category: "transferable",
    labels: { fi: "asiakasymmärrys", sv: "kundförståelse", en: "client understanding" },
    synonyms: [
      "asiakasymmarrys",
      "asiakasymmärrys",
      "kundforstaelse",
      "kundförståelse",
      "client understanding",
      "asiakkaan toimintaympariston tulkinta",
      "asiakkaan toimintaympäristön tulkinta",
      "asiakkaan liiketoiminnan ymmartaminen",
      "asiakkaan liiketoiminnan ymmärtäminen",
      "kayttajatarpeiden tulkinta",
      "käyttäjätarpeiden tulkinta",
    ],
  },
  {
    id: "reporting",
    category: "transferable",
    labels: { fi: "raportointi", sv: "rapportering", en: "reporting" },
    synonyms: [
      "raportointi",
      "raportering",
      "rapportering",
      "reporting",
      "raporttien luonnos",
      "raporttien luonnostelu",
      "raporttiyhteenvedot",
      "poikkeamaraportit",
    ],
  },
  {
    id: "information_synthesis",
    category: "transferable",
    labels: { fi: "aineiston tiivistäminen", sv: "materialsammanfattning", en: "information synthesis" },
    synonyms: [
      "aineiston tiivistaminen",
      "aineiston tiivistäminen",
      "taustatiivistelmat",
      "taustatiivistelmät",
      "suurten aineistojen esikarsinta",
      "hankinta-aineiston esikarsinta",
      "vaatimusluetteloiden tiivistaminen",
      "vaatimusluetteloiden tiivistäminen",
      "information synthesis",
      "materialsammanfattning",
    ],
  },
  {
    id: "planning",
    category: "transferable",
    labels: { fi: "suunnittelu", sv: "planering", en: "planning" },
    synonyms: [
      "suunnittelu",
      "planering",
      "planning",
      "viikkosuunnitelman luonnos",
      "reittisuunnittelu",
      "reitin optimointi",
      "reitti- ja kuormasuunnittelu",
    ],
  },
  {
    id: "analysis",
    category: "transferable",
    labels: { fi: "analyysi", sv: "analys", en: "analysis" },
    synonyms: ["analyysi", "analys", "analysis", "poikkeamien havaitseminen", "tuotosseurannan poikkeamat"],
  },
  {
    id: "prioritisation",
    category: "transferable",
    labels: { fi: "priorisointi", sv: "prioritering", en: "prioritisation" },
    synonyms: [
      "priorisointi",
      "prioritering",
      "prioritisation",
      "prioritization",
      "poikkeustilanteiden priorisointi",
      "tietoturva- ja saavutettavuusvaatimusten priorisointi",
    ],
  },
  {
    id: "coding",
    category: "tools_technologies",
    labels: { fi: "ohjelmointi", sv: "programmering", en: "programming" },
    synonyms: [
      "ohjelmointi",
      "programmering",
      "programming",
      "coding",
      "koodaus",
      "kodning",
      "koodiluonnokset",
      "koodin taydennys",
      "koodin täydennys",
      "refaktorointiehdotukset",
      "virheviestien tulkinta",
    ],
  },
  {
    id: "unit_testing",
    category: "tools_technologies",
    labels: { fi: "yksikkötestaus", sv: "enhetstestning", en: "unit testing" },
    synonyms: [
      "yksikkotestaus",
      "yksikkötestaus",
      "yksikkotestien hahmottelu",
      "yksikkötestien hahmottelu",
      "yksikkotestit",
      "yksikkötestit",
      "enhetstestning",
      "unit testing",
      "testaus",
    ],
  },
  {
    id: "version_control",
    category: "tools_technologies",
    labels: { fi: "versionhallinta", sv: "versionshantering", en: "version control" },
    synonyms: ["versionhallinta", "versionshantering", "version control", "git"],
  },
  {
    id: "spreadsheets",
    category: "tools_technologies",
    labels: { fi: "taulukointi", sv: "kalkylarbete", en: "spreadsheet work" },
    synonyms: ["taulukointi", "kalkylarbete", "spreadsheet", "tiliointiehdotukset", "tiliöintiehdotukset"],
  },
  {
    id: "translation_tools",
    category: "tools_technologies",
    labels: { fi: "kieliversiointi", sv: "språkversionering", en: "language versions" },
    synonyms: [
      "ohjeiden kaantaminen selkokielelle",
      "ohjeiden kääntäminen selkokielelle",
      "tyoohjeiden kaantaminen",
      "työohjeiden kääntäminen",
      "tiedotteiden kieliversiot",
      "litterointi",
    ],
  },
  {
    id: "healthcare_licence",
    category: "formal_qualification",
    labels: { fi: "terveydenhuollon ammattioikeus", sv: "hälso- och sjukvårdsrätt", en: "healthcare professional licence" },
    synonyms: ["valvira", "ammattioikeus", "laillistettu", "terveydenhuollon ammattioikeus", "lakemahoito", "lääkehoito"],
  },
  {
    id: "audit_qualification",
    category: "formal_qualification",
    labels: { fi: "tilintarkastajan pätevyys", sv: "revisorsbehörighet", en: "audit qualification" },
    synonyms: ["kht", "klt", "tilintarkastaja", "revisorsbehorighet", "revisorsbehörighet", "audit qualification"],
  },
  {
    id: "electrical_qualification",
    category: "formal_qualification",
    labels: { fi: "sähköpätevyys", sv: "elbehörighet", en: "electrical qualification" },
    synonyms: ["sahkopatevyys", "sähköpätevyys", "sahkoturvallisuus", "sähköturvallisuus", "elbehorighet", "elbehörighet"],
  },
  {
    id: "legal_qualification",
    category: "formal_qualification",
    labels: { fi: "oikeudellinen kelpoisuus", sv: "juridisk behörighet", en: "legal qualification" },
    synonyms: ["oikeudellinen kelpoisuus", "asianajaja", "oikeudenkayntiedustus", "oikeudenkäyntiedustus"],
  },
  {
    id: "client_communication",
    category: "interpersonal",
    labels: { fi: "asiakasviestintä", sv: "kundkommunikation", en: "client communication" },
    synonyms: [
      "asiakasviestinta",
      "asiakasviestintä",
      "kundkommunikation",
      "client communication",
      "omaisviestinta",
      "omaisviestintä",
      "asiakkaan neuvonta",
      "asiakaspalvelun savy",
      "asiakaspalvelun sävy",
    ],
  },
  {
    id: "negotiation",
    category: "interpersonal",
    labels: { fi: "neuvottelu", sv: "förhandling", en: "negotiation" },
    synonyms: ["neuvottelu", "forhandling", "förhandling", "negotiation", "kaavaneuvottelut", "asiakasneuvottelu"],
  },
  {
    id: "face_to_face_care",
    category: "interpersonal",
    labels: { fi: "läsnäolo ja kohtaaminen", sv: "närvaro och möte", en: "presence and encounter" },
    synonyms: [
      "lasnaolo",
      "läsnäolo",
      "narvaro",
      "närvaro",
      "hoivatyo",
      "hoivatyö",
      "lapsen kohtaaminen",
      "kansalaisen kohtaaminen",
      "asiakaskohtaaminen",
      "huoltajayhteistyo",
      "huoltajayhteistyö",
    ],
  },
  {
    id: "interviewing",
    category: "interpersonal",
    labels: { fi: "haastattelu", sv: "intervju", en: "interviewing" },
    synonyms: ["haastattelu", "intervju", "interviewing"],
  },
  {
    id: "professional_judgement",
    category: "decision_responsibility",
    labels: { fi: "ammatillinen harkinta", sv: "yrkesmässigt omdöme", en: "professional judgement" },
    synonyms: [
      "ammatillinen harkinta",
      "yrkesmassigt omdome",
      "yrkesmässigt omdöme",
      "professional judgement",
      "tilinpaatosharkinta",
      "tilinpäätösharkinta",
      "lahdekritiikki",
      "lähdekritiikki",
    ],
  },
  {
    id: "production_approval",
    category: "decision_responsibility",
    labels: { fi: "tuotantovastuu", sv: "produktionsansvar", en: "production responsibility" },
    synonyms: [
      "tuotantovastuu",
      "tuotantokoodin hyvaksynta",
      "tuotantokoodin hyväksyntä",
      "vastuun kantaminen tuotantokoodista",
      "produktionsansvar",
      "production responsibility",
    ],
  },
  {
    id: "sign_off",
    category: "decision_responsibility",
    labels: { fi: "vastuunallekirjoitus", sv: "ansvarsunderskrift", en: "sign-off responsibility" },
    synonyms: ["vastuunallekirjoitus", "ansvarsunderskrift", "sign-off", "julkaisupaatös", "julkaisupäätös"],
  },
  {
    id: "clinical_responsibility",
    category: "decision_responsibility",
    labels: { fi: "kliininen vastuu", sv: "kliniskt ansvar", en: "clinical responsibility" },
    synonyms: ["kliininen vastuu", "kliniskt ansvar", "clinical responsibility", "hoitopaatos", "hoitopäätös"],
  },
  {
    id: "legal_responsibility",
    category: "decision_responsibility",
    labels: { fi: "oikeudellinen vastuu", sv: "juridiskt ansvar", en: "legal responsibility" },
    synonyms: ["oikeudellinen vastuu", "juridiskt ansvar", "legal responsibility", "viranomaisvastuu"],
  },
  {
    id: "risk_ownership",
    category: "decision_responsibility",
    labels: { fi: "riskien omistajuus", sv: "riskägarskap", en: "risk ownership" },
    synonyms: ["riskien omistajuus", "riskagarskap", "riskägarskap", "risk ownership", "suunnitteluvastuu"],
  },
  {
    id: "on_site_installation",
    category: "physical_embodied",
    labels: { fi: "asennus paikan päällä", sv: "installation på plats", en: "on-site installation" },
    synonyms: [
      "asennus",
      "asennus tyomaalla",
      "asennus työmaalla",
      "asennus paikan paalla",
      "asennus paikan päällä",
      "rakenteen sovittaminen paikan paalla",
      "rakenteen sovittaminen paikan päällä",
      "rakenteiden toteutus",
      "materiaalin tyosto",
      "materiaalin työstö",
    ],
  },
  {
    id: "patient_examination",
    category: "physical_embodied",
    labels: { fi: "potilaan tutkiminen", sv: "undersökning av patienten", en: "patient examination" },
    synonyms: [
      "potilaan tutkiminen",
      "undersokning av patienten",
      "undersökning av patienten",
      "patient examination",
      "potilaan tilan arviointi",
    ],
  },
  {
    id: "vehicle_control",
    category: "physical_embodied",
    labels: { fi: "ajoneuvon hallinta", sv: "fordonskontroll", en: "vehicle control" },
    synonyms: [
      "ajoneuvon hallinta",
      "fordonskontroll",
      "vehicle control",
      "ajo- ja lepoaikojen noudattaminen",
      "poikkeavat liikennetilanteet",
      "kuorman varmistus",
    ],
  },
  {
    id: "food_preparation",
    category: "physical_embodied",
    labels: { fi: "ruoan valmistus", sv: "matlagning", en: "food preparation" },
    synonyms: ["ruoan valmistus", "matlagning", "food preparation", "ruoka-ajat ja erityisruokavaliot"],
  },
  {
    id: "site_safety",
    category: "physical_embodied",
    labels: { fi: "työturvallisuus", sv: "arbetsmiljösäkerhet", en: "workplace safety" },
    synonyms: [
      "tyoturvallisuus",
      "työturvallisuus",
      "tyomaan turvallisuus",
      "työmaan turvallisuus",
      "turvallisuuden valvonta",
      "asiakasturvallisuus",
    ],
  },
  {
    id: "cleaning",
    category: "physical_embodied",
    labels: { fi: "tilojen puhdistus", sv: "lokalskötsel", en: "premises cleaning" },
    synonyms: ["tilojen puhdistus", "hygienia", "erityiskohteiden hygienia"],
  },
  {
    id: "animal_care",
    category: "physical_embodied",
    labels: { fi: "eläinten hoito", sv: "djurskötsel", en: "animal care" },
    synonyms: ["elainten hoito", "eläinten hoito", "djurskotsel", "djurskötsel", "animal care"],
  },
  {
    id: "performance",
    category: "physical_embodied",
    labels: { fi: "esiintyminen", sv: "framträdande", en: "performance" },
    synonyms: ["esiintyminen", "framtradande", "framträdande", "yhteismusisointi", "taiteellinen paatos", "taiteellinen päätös"],
  },
];

const QUALIFICATION_DESCRIPTION_HINTS: Array<{ id: string; pattern: RegExp }> = [
  { id: "healthcare_licence", pattern: /valvira|ammattioikeus|laillistettu|lääkehoito|laakehoito/i },
  { id: "audit_qualification", pattern: /\bkht\b|\bklt\b|tilintarkast/i },
  { id: "electrical_qualification", pattern: /sähköpätevyys|sahkopatevyys|sähköturvallisuus/i },
  { id: "legal_qualification", pattern: /asianajaj|oikeudenkäynti|oikeudenkaynti|oikeudellinen kelpoisuus/i },
];

export function foldSkillText(value: string): string {
  return value
    .toLocaleLowerCase("fi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

type SynonymIndexItem = { folded: string; entry: TaxonomyEntry; length: number };

export const TAXONOMY_BY_ID = new Map(SKILL_TAXONOMY.map((entry) => [entry.id, entry]));

export const SYNONYM_INDEX: SynonymIndexItem[] = SKILL_TAXONOMY.flatMap((entry) =>
  [...entry.synonyms, entry.labels.fi, entry.labels.sv, entry.labels.en, entry.id.replaceAll("_", " ")].map(
    (synonym) => ({
      folded: foldSkillText(synonym),
      entry,
      length: foldSkillText(synonym).length,
    }),
  ),
)
  .filter((item) => item.folded.length >= 3)
  .sort((a, b) => b.length - a.length);

export function qualificationHintsFromDescription(description: string): TaxonomyEntry[] {
  if (!description.trim()) return [];
  const found: TaxonomyEntry[] = [];
  for (const hint of QUALIFICATION_DESCRIPTION_HINTS) {
    if (hint.pattern.test(description)) {
      const entry = TAXONOMY_BY_ID.get(hint.id);
      if (entry) found.push(entry);
    }
  }
  return found;
}

import { PROMPT_VERSION } from "../schemas/scores";

export const SCORING_PROMPT_VERSION = PROMPT_VERSION;

export function scoringSystemPrompt(): string {
  return `Olet Suomen työmarkkinoita ja ammattitehtäviä tunteva arvioija. Annat kaksi erillistä pistettä 0–10.

theoreticalAIExposure = miten suuri osa ammatin ydin tehtävistä on teoriassa tekoälylle soveltuvaa (teksti, koodi, data, digitaaliset päätökset). Tämä EI ole irtisanomis- tai katoamisriski.

currentAIAdoption = miten laajasti tekoälytyökaluja on vuonna 2026 havaittavasti käytössä suomalaisilla työpaikoilla tässä ammatissa.

Säännöt:
- Erota altistus ja syrjäyttämisriski. Avustaminen ≠ työntekijän korvaaminen.
- Huomioi Suomen sääntely, julkisen sektorin velvoitteet, kielivaatimukset (suomi/ruotsi), työehtosopimukset, sosiaali- ja terveydenhuollon sekä koulutuksen vastuut, ja yritysten käyttöönoton kitka.
- Älä väitä, että korkea altistus tarkoittaa työpaikkojen katoamista.
- Älä keksi virallisia tilastoja. Perustele tehtävien luonteen ja julkisesti tunnetun käytön avulla.
- Vastaa JSON-objektilla, ilman markdownia.

theoreticalAIExposure:
9–10 lähes kokonaan teksti, koodi, data tai digitaaliset päätökset
7–8 pääosin kognitiivista/digitaalista, jonkin verran ruumiillista tai vuorovaikutusta
5–6 sekä tekoälylle soveltuvaa että kehollista/relationaalista työtä
3–4 pääosin ruumiillista, vuorovaikutteista tai tilannesidonnaista
1–2 lähes kokonaan ruumiillista, ulkona tai kehollisuudesta riippuvaa
0 ei uskottavaa vaikutusta ydintehtäviin

currentAIAdoption:
8–10 dokumentoidut työkalut laajasti suomalaisilla työpaikoilla
6–7 työkaluja on ja käyttö on merkittävää
4–5 pilotteja ja varhaista käyttöä, ei valtavirtaa
2–3 satunnaisia kokeiluja tai lähinnä keskustelua
0–1 ei merkittävää havaittavaa käyttöä

JSON-kentät:
theoreticalAIExposure, currentAIAdoption, exposureRationale, adoptionRationale,
humanCriticalTasks (merkkijonotaulukko), AIApplicableTasks (merkkijonotaulukko),
uncertainty (low|medium|high),
distinguishesExposureFromDisplacement (aina true).
Valinnaiset: recommendedSkills, exposureReasons (enintään 3 lausetta),
exposureRangeLow, exposureRangeHigh (vain jos voit perustella tehtävien jaosta; älä keksi ±-väliä epävarmuudesta).
Älä keksi palkkoja, virallisia tilastoja, työttömyysennusteita tai lähdeviitteitä.

Perustelut suomeksi.`;
}

export function scoringUserPrompt(input: {
  occupationCode: string;
  occupationNameFi: string;
  occupationNameEn: string;
  description: string;
  majorGroupName: string;
  employedPersons: number | null;
  laborMarketOutlook: string;
}): string {
  return `Ammatti ${input.occupationCode} ${input.occupationNameFi} (${input.occupationNameEn}).
Pääluokka: ${input.majorGroupName}.
Työlliset (Tilastokeskus, jos tiedossa): ${input.employedPersons ?? "ei tietoa"}.
Työmarkkinanäkymä (kooste, ei KEHA:n valtakunnallinen luku): ${input.laborMarketOutlook}.
Virallinen kuvaus:
${input.description || "Ei virallista kuvausta."}

promptVersion=${SCORING_PROMPT_VERSION}`;
}

import { getLocale, getTranslations } from "next-intl/server";
import { loadCatalog, visualOccupations } from "@/lib/catalog";
import { BAND_ORDER, BAND_RANGE_LABEL, buildMarketComposition } from "@/lib/market-composition";
import { formatSharePercent } from "@/lib/occupation-view";
import { formatNumber, occupationName } from "@/lib/utils";

export default async function MethodologyPage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const catalog = loadCatalog();
  const p = catalog.provenance;

  // Everything below is read from the committed catalog, so this page cannot
  // drift away from the data the visualiser actually shows.
  const visual = visualOccupations(catalog.occupations);
  const composition = buildMarketComposition(visual, "exposure");
  const coverage = composition.coverage;
  const fixtures = visual
    .filter((row) => row.scoreStatus === "fixture")
    .sort((a, b) => a.occupationCode.localeCompare(b.occupationCode));
  const scoredAtDates = [
    ...new Set(fixtures.map((row) => row.scoredAt).filter((value): value is string => Boolean(value))),
  ].sort();
  const unavailable = t("common.unavailable");

  return (
    <article className="prose prose-slate max-w-3xl">
      <h1 className="font-serif text-3xl text-[#0b3f3c]">{t("methodology.title")}</h1>
      <p className="text-lg">{t("methodology.lead")}</p>
      <p className="rounded border border-[#e6d3b8] bg-[#f8ead6] px-3 py-2 font-semibold text-[#8a4b12]">
        {t("notice")}
      </p>

      <h2>Mitä tämä työkalu näyttää</h2>
      <p>
        Ammattialtistus kuvaa Ammattiluokitus 2010 -ammattien teoreettista tekoälyaltistusta,
        havaittua käyttöönottoa ja työmarkkinoiden kohtaantoa. Altistus on arvio tehtävien
        luonteesta. Se ei ole ennuste irtisanomisista, automatisaatiosta tai ammatin
        katoamisesta.
      </p>

      <h2>Viralliset lähteet (haettu {catalog.retrievedAt})</h2>
      <ul>
        <li>
          Ammattiluokitus 2010, <code>{p.classification.localId}</code>, {p.classification.itemCount}{" "}
          luokkaa.{" "}
          <a href={p.classification.url}>{p.classification.url}</a>
        </li>
        <li>
          Tilastokeskus, työssäkäynti, taulu {p.employment.tableId}, vuosi {p.employment.year},
          päivitetty {p.employment.updated ?? "ei tiedossa"}.{" "}
          <a href={p.employment.url}>{p.employment.url}</a>
        </li>
        <li>
          Työvoimabarometri (KEHA), kohtaantojakso {p.outlook.period}, {p.outlook.occupationCount}{" "}
          ammattia. {p.outlook.aggregation}{" "}
          <a href={p.outlook.catalogUrl}>{p.outlook.catalogUrl}</a>
        </li>
      </ul>
      <p>
        Koko kartoitus ja kenttäkohtaiset skeemat: <code>docs/SOURCE_DATA_MAPPING.md</code>.
      </p>

      <h2>Mitä ei ole viranomaisaineistoa</h2>
      <p>
        Tekoälyaltistus- ja käyttöönottopisteet eivät ole Tilastokeskuksen, KEHA-keskuksen tai
        TEM:n tilastoja. Ilman rajapinta-avainta näytetään vain merkitty esimerkkijoukko
        (<code>fixture/2026-08-29</code>). Muut ammatit näkyvät pisteyttämättöminä. Pisteytys
        ajetaan vain offline-pipelineissa, ei selaimessa eikä Next.js-rajapinnassa.
      </p>

      <h2>Työmarkkinanäkymän kooste</h2>
      <p>
        Työvoimabarometrin julkinen JSON palauttaa kohtaannon 19 maakunnalle, ei yhtä
        valtakunnallista ammattikohtaista indeksiä. Näytetty kansallinen tila on työllisten
        (<code>toissa</code>) mukaan painotettu enemmistö alueiden <code>kohtaantotila</code>
        -kentästä. Indeksi on painotettu keskiarvo etumerkillisestä <code>kohtaantoaste</code>
        -luvusta (pula positiivinen, ylitarjonta negatiivinen). Tämä on dokumentoitu johdannainen,
        ei KEHA:n julkaisema valtakunnallinen tunnusluku.
      </p>

      <h2>Vanhat ja puuttuvat tiedot</h2>
      <p>
        Työssäkäyntitilaston tuorein vuosi tässä poiminnassa on 2023, joten työllisyys merkitään
        vanhentuneeksi vuonna 2026. Jos AML-koodia ei ole barometrissa tai työllisyystaulussa,
        kenttä näytetään puuttuvana. Pisteyttämättömät ammatit eivät saa keksittyä lukua.
      </p>

      <h2>{t("workday.title")}</h2>
      <p>{t("workday.lead")}</p>
      <p>{t("workday.privacy")}</p>
      <p>
        <code>POST /api/workday/analyze</code> {t("workday.errorUnavailable")}
      </p>

      <h2>{t("compare.title")}</h2>
      <p>{t("compare.hint")}</p>

      <h2>{t("methodology.analysisTitle")}</h2>
      <p>{t("methodology.analysisLead")}</p>
      <p>{t("methodology.weights")}</p>
      <p>{t("analysis.methodologySummary")}</p>

      <h2>{t("bridges.title")}</h2>
      <p>{t("bridges.calculated")}</p>
      <p>{t("bridges.noSalary")}</p>

      <h2>{t("methodology.compositionTitle")}</h2>
      <p>{t("methodology.compositionLead")}</p>

      <h2>{t("methodology.coverageTitle")}</h2>
      <ul>
        <li>
          {t("composition.coverageRows", {
            scored: coverage.scoredCount,
            total: coverage.occupationCount,
            percent:
              coverage.rowShare == null ? unavailable : formatSharePercent(coverage.rowShare, locale),
          })}
        </li>
        <li>
          {coverage.employedShare == null
            ? t("composition.coverageEmploymentUnavailable")
            : t("composition.coverageEmployment", {
                workers: formatNumber(coverage.employedScored, locale),
                percent: formatSharePercent(coverage.employedShare, locale),
              })}
        </li>
        <li>{t("composition.coverageFixture", { count: coverage.fixtureCount })}</li>
        <li>{t("composition.coverageWarning")}</li>
      </ul>

      <h2>{t("methodology.bandsTitle")}</h2>
      <p>{t("methodology.bandsLead")}</p>
      <h3>{t("methodology.bandsExposure")}</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">{t("composition.band")}</th>
            <th scope="col">{t("methodology.bandMeaning")}</th>
          </tr>
        </thead>
        <tbody>
          {BAND_ORDER.map((band) => (
            <tr key={`exposure-${band}`}>
              <th scope="row">{BAND_RANGE_LABEL[band]}</th>
              <td>{t(`scoreMeaning.exposure.${band}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>{t("methodology.bandsAdoption")}</h3>
      <table>
        <thead>
          <tr>
            <th scope="col">{t("composition.band")}</th>
            <th scope="col">{t("methodology.bandMeaning")}</th>
          </tr>
        </thead>
        <tbody>
          {BAND_ORDER.map((band) => (
            <tr key={`adoption-${band}`}>
              <th scope="row">{BAND_RANGE_LABEL[band]}</th>
              <td>{t(`scoreMeaning.adoption.${band}`)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t("methodology.provenanceTitle")}</h2>
      <ul>
        <li>
          {t("detail.prompt")}: <code>{catalog.scoring?.promptVersion ?? unavailable}</code>
        </li>
        <li>
          {t("detail.model")}: <code>{catalog.scoring?.fixtureModel ?? unavailable}</code>
        </li>
        <li>
          {t("detail.scoredAt")}: {scoredAtDates.length ? scoredAtDates.join(", ") : unavailable}
        </li>
        <li>
          {t("detail.year")}: {p.employment.year} ({p.employment.tableId})
        </li>
        <li>
          {t("regional.period")}: {p.outlook.period ?? unavailable}
        </li>
      </ul>

      <h2>{t("methodology.fixturesTitle")}</h2>
      <p>{t("methodology.fixturesLead")}</p>
      <table>
        <thead>
          <tr>
            <th scope="col">{t("composition.code")}</th>
            <th scope="col">{t("detail.title")}</th>
            <th scope="col">{t("detail.exposure")}</th>
            <th scope="col">{t("detail.adoption")}</th>
          </tr>
        </thead>
        <tbody>
          {fixtures.map((row) => (
            <tr key={row.occupationCode}>
              <th scope="row">{row.occupationCode}</th>
              <td>{occupationName(row, locale)}</td>
              <td>{row.theoreticalAIExposure ?? unavailable}</td>
              <td>{row.currentAIAdoption ?? unavailable}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{t("methodology.regionalTitle")}</h2>
      <p>{t("methodology.regionalLead")}</p>
      <p>{t("regional.censoredNote")}</p>
      <p>{t("bridges.noSalary")}</p>

      <h2>Saavutettavuus ja kieli</h2>
      <p>
        Oletuskieli on suomi. Ruotsi ja englanti käyttävät Tilastokeskuksen luokitusnimiä.
        Viralliset kuvaukset ovat pääosin suomeksi. Käyttöliittymä on näppäimistöllä
        käytettävä; vähentynyt liike kytkee kaavioanimaatiot pois.
      </p>
    </article>
  );
}

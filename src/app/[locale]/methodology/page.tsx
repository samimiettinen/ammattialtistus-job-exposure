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

      <h2>{t("methodology.whatTitle")}</h2>
      <p>{t("methodology.whatBody")}</p>

      <h2>{t("methodology.sourcesTitle", { date: catalog.retrievedAt })}</h2>
      <ul>
        <li>
          {t("methodology.sourceClassification", {
            localId: p.classification.localId,
            count: p.classification.itemCount,
          })}{" "}
          <a href={p.classification.url}>{p.classification.url}</a>
        </li>
        <li>
          {t("methodology.sourceEmployment", {
            tableId: p.employment.tableId,
            year: p.employment.year,
            updated: p.employment.updated ?? t("methodology.updatedUnknown"),
          })}{" "}
          <a href={p.employment.url}>{p.employment.url}</a>
        </li>
        <li>
          {t("methodology.sourceOutlook", {
            period: p.outlook.period ?? unavailable,
            count: p.outlook.occupationCount,
          })}{" "}
          <a href={p.outlook.catalogUrl}>{p.outlook.catalogUrl}</a>
        </li>
      </ul>
      <p>{t("methodology.sourceAggregation", { rule: p.outlook.aggregation })}</p>
      <p>{t("methodology.mappingNote")}</p>

      <h2>{t("methodology.notOfficialTitle")}</h2>
      <p>
        {t("methodology.notOfficialBody", {
          model: catalog.scoring?.fixtureModel ?? unavailable,
        })}
      </p>

      <h2>{t("methodology.compositeTitle")}</h2>
      <p>{t("methodology.compositeBody")}</p>

      <h2>{t("methodology.staleTitle")}</h2>
      <p>{t("methodology.staleBody", { year: p.employment.year })}</p>

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

      <h2>{t("methodology.accessibilityTitle")}</h2>
      <p>{t("methodology.accessibilityBody")}</p>
    </article>
  );
}

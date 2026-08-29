"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { ProvenanceTag } from "@/components/ProvenanceTag";
import {
  BAND_RANGE_LABEL,
  buildMarketComposition,
} from "@/lib/market-composition";
import { formatScore, formatSharePercent } from "@/lib/occupation-view";
import type { CompositionMetric, CrossTabCell, MarketComposition as Composition, Occupation } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";
import type { HierarchyLabel } from "@/lib/treemap-data";
import { formatNumber, occupationName } from "@/lib/utils";

/** Smallest share the one-decimal format can express. */
const PERCENT_FLOOR = 0.001;

function percentText(share: number | null, locale: string, unavailable: string): string {
  if (share == null) return unavailable;
  // A real but tiny share must not round down to a flat "0 %" — that reads as
  // "nobody", and some of these rows hold four-figure numbers of people.
  if (share > 0 && share < PERCENT_FLOOR) {
    return `< ${formatSharePercent(PERCENT_FLOOR, locale)} %`;
  }
  return `${formatSharePercent(share, locale)} %`;
}

function meanText(mean: number | null, locale: string, unavailable: string): string {
  if (mean == null) return unavailable;
  return formatScore(mean, locale);
}

/** Proportional bar. The numbers next to it carry the meaning; this is only a shape. */
function ShareBar({ share }: { share: number | null }) {
  return (
    <span aria-hidden className="mt-1 block h-1.5 w-full rounded bg-[#efe9de]">
      <span
        className="block h-1.5 rounded bg-[#0f5c5c]"
        style={{ width: `${Math.round((share ?? 0) * 100)}%` }}
      />
    </span>
  );
}

function CoverageStrip({ composition }: { composition: Composition }) {
  const t = useTranslations();
  const locale = useLocale();
  const unavailable = t("common.unavailable");
  const { coverage } = composition;

  return (
    <div className="rounded border border-[#0f5c5c] bg-[#f3f8f7] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#0b3f3c]">{t("composition.coverageTitle")}</h4>
        <ProvenanceTag kind={coverage.scoredCount === 0 ? "unavailable" : "computed"} />
      </div>
      <p className="mt-1 text-sm">
        {t("composition.coverageRows", {
          scored: coverage.scoredCount,
          total: coverage.occupationCount,
          percent:
            coverage.rowShare == null ? unavailable : formatSharePercent(coverage.rowShare, locale),
        })}
      </p>
      <ShareBar share={coverage.employedShare} />
      <p className="mt-1 text-sm">
        {coverage.employedShare == null
          ? t("composition.coverageEmploymentUnavailable")
          : t("composition.coverageEmployment", {
              workers: formatNumber(coverage.employedScored, locale),
              percent: formatSharePercent(coverage.employedShare, locale),
            })}
      </p>
      <p className="mt-1 text-xs text-[#8a4b12]">
        {coverage.scoredCount === 0 ? t("composition.coverageEmpty") : t("composition.coverageWarning")}
      </p>
      {coverage.fixtureCount > 0 ? (
        <p className="mt-1 text-xs text-[#8a4b12]">
          {t("composition.coverageFixture", { count: coverage.fixtureCount })}
        </p>
      ) : null}
      {coverage.scoredMissingEmploymentCount > 0 ? (
        <p className="mt-1 text-xs text-[#5c6570]">
          {t("composition.coverageMissingEmployment", { count: coverage.scoredMissingEmploymentCount })}
        </p>
      ) : null}
    </div>
  );
}

function OfficialPanel({ composition }: { composition: Composition }) {
  const t = useTranslations();
  const locale = useLocale();
  const unavailable = t("common.unavailable");

  return (
    <section className="rounded border border-[#d8d2c6] bg-white p-3" aria-labelledby="composition-official">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="composition-official" className="font-semibold text-[#0b3f3c]">
          {t("composition.officialTitle")}
        </h3>
        <ProvenanceTag kind="official" />
      </div>
      <p className="mt-1 text-xs text-[#5c6570]">{t("composition.officialLead")}</p>
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[#5c6570]">
            <th scope="col" className="py-1">{t("composition.outlookColumn")}</th>
            <th scope="col" className="py-1 text-right">{t("composition.occupations")}</th>
            <th scope="col" className="py-1 text-right">{t("composition.workers")}</th>
            <th scope="col" className="py-1 text-right">{t("composition.shareOfView")}</th>
          </tr>
        </thead>
        <tbody>
          {composition.official.outlook.map((bucket) => (
            <tr key={bucket.outlook} className="border-t border-[#efe9de] align-top">
              <th scope="row" className="py-1 pr-2 text-left font-normal">
                {t(`outlook.${bucket.outlook}`)}
              </th>
              <td className="py-1 text-right tabular-nums">{bucket.occupationCount}</td>
              <td className="py-1 text-right tabular-nums">{formatNumber(bucket.employedPersons, locale)}</td>
              <td className="w-28 py-1 text-right tabular-nums">
                {percentText(bucket.share, locale, unavailable)}
                <ShareBar share={bucket.share} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-[#5c6570]">{t("composition.officialNote")}</p>
      {composition.official.missingEmploymentCount > 0 ? (
        <p className="mt-1 text-xs text-[#5c6570]">
          {t("composition.coverageMissingEmployment", {
            count: composition.official.missingEmploymentCount,
          })}
        </p>
      ) : null}
    </section>
  );
}

function AiPanel({ composition }: { composition: Composition }) {
  const t = useTranslations();
  const locale = useLocale();
  const unavailable = t("common.unavailable");
  const isAdoption = composition.metric === "adoption";

  return (
    <div className="space-y-3">
      <CoverageStrip composition={composition} />
      <section className="rounded border border-[#e6d3b8] bg-[#fff8ee] p-3" aria-labelledby="composition-ai">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="composition-ai" className="font-semibold text-[#8a4b12]">
            {isAdoption ? t("composition.aiTitleAdoption") : t("composition.aiTitleExposure")}
          </h3>
          <ProvenanceTag kind={composition.ai.weightedMean == null ? "unavailable" : "ai"} />
        </div>
        <p className="mt-1 text-xs text-[#5c6570]">{t("composition.aiLead")}</p>
        <p className="mt-2 text-sm">
          <span className="text-[#5c6570]">
            {isAdoption ? t("composition.meanAdoption") : t("composition.meanExposure")}:
          </span>{" "}
          <strong className="text-lg tabular-nums">
            {meanText(composition.ai.weightedMean, locale, unavailable)}
          </strong>
          {composition.ai.weight > 0 ? (
            <span className="ml-2 text-xs text-[#5c6570]">
              {t("composition.meanWeight", { workers: formatNumber(composition.ai.weight, locale) })}
            </span>
          ) : null}
        </p>
        {composition.ai.bands.length ? (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#5c6570]">
                <th scope="col" className="py-1">{t("composition.band")}</th>
                <th scope="col" className="py-1 text-right">{t("composition.occupations")}</th>
                <th scope="col" className="py-1 text-right">{t("composition.workers")}</th>
                <th scope="col" className="py-1 text-right">{t("composition.shareOfScored")}</th>
              </tr>
            </thead>
            <tbody>
              {composition.ai.bands.map((bucket) => (
                <tr key={bucket.band} className="border-t border-[#efe9de] align-top">
                  <th scope="row" className="py-1 pr-2 text-left font-normal tabular-nums">
                    {BAND_RANGE_LABEL[bucket.band]}
                  </th>
                  <td className="py-1 text-right tabular-nums">{bucket.occupationCount}</td>
                  <td className="py-1 text-right tabular-nums">{formatNumber(bucket.employedPersons, locale)}</td>
                  <td className="w-28 py-1 text-right tabular-nums">
                    {percentText(bucket.share, locale, unavailable)}
                    <ShareBar share={bucket.share} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm">{unavailable}</p>
        )}
        <p className="mt-2 text-xs text-[#8a4b12]">{t("composition.aiNotice")}</p>
      </section>
    </div>
  );
}

function CrossTable({
  title,
  columnLabel,
  rows,
  label,
}: {
  title: string;
  columnLabel: string;
  rows: CrossTabCell[];
  label: (cell: CrossTabCell) => string;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const unavailable = t("common.unavailable");

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#0b3f3c]">{title}</h4>
        <ProvenanceTag kind={rows.some((cell) => cell.weightedMean != null) ? "ai" : "unavailable"} />
      </div>
      <table className="mt-1 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[#5c6570]">
            <th scope="col" className="py-1">{columnLabel}</th>
            <th scope="col" className="py-1 text-right">{t("composition.scoredRows")}</th>
            <th scope="col" className="py-1 text-right">{t("composition.workers")}</th>
            <th scope="col" className="py-1 text-right">{t("composition.mean")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((cell) => (
            <tr key={cell.key} className="border-t border-[#efe9de]">
              <th scope="row" className="py-1 pr-2 text-left font-normal">
                {label(cell)}
              </th>
              <td className="py-1 text-right tabular-nums">{cell.scoredCount}</td>
              <td className="py-1 text-right tabular-nums">
                {cell.scoredCount === 0 ? unavailable : formatNumber(cell.employedPersons, locale)}
              </td>
              <td className="py-1 text-right tabular-nums">
                {meanText(cell.weightedMean, locale, unavailable)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MarketComposition({
  occupations,
  hierarchy,
}: {
  occupations: Occupation[];
  hierarchy: HierarchyLabel[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const tab = useVisualizerStore((state) => state.tab);
  const metric: CompositionMetric = tab === "adoption" ? "adoption" : "exposure";
  const composition = useMemo(
    () => buildMarketComposition(occupations, metric),
    [occupations, metric],
  );
  const majorGroupNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of hierarchy) {
      if (row.level === 1) map.set(row.occupationCode, occupationName(row, locale));
    }
    return map;
  }, [hierarchy, locale]);

  if (occupations.length === 0) {
    return (
      <section className="rounded-lg border border-[#d8d2c6] bg-white px-3 py-2 text-sm" aria-live="polite">
        <h2 className="font-serif text-lg text-[#0b3f3c]">{t("composition.title")}</h2>
        <p className="mt-1 text-[#5c6570]">{t("composition.empty")}</p>
      </section>
    );
  }

  // Työmarkkinanäkymä leads with the official mix, which covers the whole view.
  // The AI tabs lead with the estimate, and the coverage strip sits inside that
  // panel so no ordering can put an AI mean above its own coverage.
  const officialFirst = tab === "outlook";

  return (
    <section className="space-y-3 rounded-lg border border-[#d8d2c6] bg-[#f7f5f0] p-3" aria-live="polite">
      <div>
        <h2 className="font-serif text-lg text-[#0b3f3c]">{t("composition.title")}</h2>
        <p className="text-xs text-[#5c6570]">{t("composition.lead")}</p>
      </div>

      {officialFirst ? (
        <>
          <OfficialPanel composition={composition} />
          <AiPanel composition={composition} />
        </>
      ) : (
        <>
          <AiPanel composition={composition} />
          <OfficialPanel composition={composition} />
        </>
      )}

      <details className="rounded border border-[#d8d2c6] bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#0b3f3c]">
          {t("composition.crossTitle")}
        </summary>
        <p className="mt-2 text-xs text-[#5c6570]">{t("composition.crossNote")}</p>
        <CrossTable
          title={
            metric === "adoption"
              ? t("composition.crossOutlookAdoption")
              : t("composition.crossOutlookExposure")
          }
          columnLabel={t("composition.outlookColumn")}
          rows={composition.crossOutlook}
          label={(cell) => t(`outlook.${cell.key as "shortage"}`)}
        />
        <CrossTable
          title={
            metric === "adoption"
              ? t("composition.crossGroupAdoption")
              : t("composition.crossGroupExposure")
          }
          columnLabel={t("composition.group")}
          rows={composition.crossMajorGroup}
          label={(cell) => `${cell.key} ${majorGroupNames.get(cell.key) ?? cell.fallbackLabel}`}
        />
      </details>
    </section>
  );
}

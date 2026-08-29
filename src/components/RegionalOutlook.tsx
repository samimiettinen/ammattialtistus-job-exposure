"use client";

import { useLocale, useTranslations } from "next-intl";
import { ProvenanceTag } from "@/components/ProvenanceTag";
import type { Occupation, RegionalOutlook as RegionalOutlookRow } from "@/lib/schemas";
import { formatNumber } from "@/lib/utils";

/** kohtaantoaste 1–5 as named in the barometer's own client bundle. */
const DEGREE_KEYS = ["regional.degree1", "regional.degree2", "regional.degree3", "regional.degree4", "regional.degree5"] as const;

function regionLabel(row: RegionalOutlookRow, unavailable: string): string {
  if (row.regionName) return row.regionCode ? `${row.regionCode} ${row.regionName}` : row.regionName;
  return row.regionCode ?? unavailable;
}

/**
 * The 19 regional kohtaanto rows the national composite is built from.
 *
 * Every number here is a barometer observation. Censored counts and calculation
 * errors show the unavailable label — never a zero, never an inferred value.
 */
export function RegionalOutlook({ occupation }: { occupation: Occupation }) {
  const t = useTranslations();
  const locale = useLocale();
  const unavailable = t("common.unavailable");
  const rows = occupation.regionalOutlook ?? [];
  const hasCensored = rows.some((row) => row.employedCensored || row.unemployedCensored);
  const period = rows.find((row) => row.period)?.period ?? null;

  return (
    <section className="mt-4 rounded border border-[#d8d2c6] bg-white p-3" aria-labelledby="regional-outlook">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="regional-outlook" className="font-semibold text-[#0b3f3c]">
          {t("regional.title")}
        </h3>
        <ProvenanceTag kind={rows.length ? "official" : "unavailable"} />
      </div>
      <p className="mt-1 text-xs text-[#5c6570]">{t("regional.lead")}</p>

      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[#5c6570]">{t("regional.unavailable")}</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-[#5c6570]">
            {t("regional.regionCount", { count: rows.length })}
            {period ? ` · ${t("regional.period")}: ${period}` : ""}
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[#5c6570]">
                  <th scope="col" className="py-1">{t("regional.region")}</th>
                  <th scope="col" className="py-1">{t("regional.state")}</th>
                  <th scope="col" className="py-1">{t("regional.degree")}</th>
                  <th scope="col" className="py-1 text-right">{t("regional.employed")}</th>
                  <th scope="col" className="py-1 text-right">{t("regional.unemployed")}</th>
                  <th scope="col" className="py-1 text-right">{t("regional.vacancies")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.regionId} className="border-t border-[#efe9de]">
                    <th scope="row" className="py-1 pr-2 text-left font-normal">
                      {regionLabel(row, unavailable)}
                    </th>
                    <td className="py-1 pr-2">
                      {row.matchingState === 99
                        ? t("regional.calculationError")
                        : t(`outlook.${row.laborMarketOutlook}`)}
                    </td>
                    <td className="py-1 pr-2">
                      {row.matchingDegree == null ? unavailable : t(DEGREE_KEYS[row.matchingDegree - 1])}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {row.employedPersons == null ? unavailable : formatNumber(row.employedPersons, locale)}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {row.unemployedJobseekers == null
                        ? unavailable
                        : formatNumber(row.unemployedJobseekers, locale)}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {row.vacancies == null ? unavailable : formatNumber(row.vacancies, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasCensored ? <p className="mt-2 text-xs text-[#5c6570]">{t("regional.censoredNote")}</p> : null}
        </>
      )}
      <p className="mt-2 text-xs text-[#5c6570]">{t("detail.derivedOutlook")}</p>
    </section>
  );
}

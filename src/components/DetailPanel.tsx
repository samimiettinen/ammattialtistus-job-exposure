"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Occupation } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";
import { formatNumber, occupationName } from "@/lib/utils";

export function DetailPanel({ occupation }: { occupation: Occupation | null }) {
  const t = useTranslations();
  const locale = useLocale();
  const setFilters = useVisualizerStore((state) => state.setFilters);

  if (!occupation) {
    return (
      <aside className="rounded-lg border border-dashed border-[#d8d2c6] bg-white/60 p-4 text-sm text-[#5c6570]">
        {t("detail.select")}
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-[#d8d2c6] bg-white p-4" aria-live="polite">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#5c6570]">{occupation.occupationCode}</p>
          <h2 className="text-xl text-[#0b3f3c]">{occupationName(occupation, locale)}</h2>
          <p className="text-sm text-[#5c6570]">
            {occupation.majorGroupCode} {occupation.majorGroupName}
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-[#d8d2c6] px-2 py-1 text-sm"
          onClick={() => setFilters({ selectedCode: "" })}
        >
          {t("detail.close")}
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[#5c6570]">{t("detail.employed")}</dt>
          <dd>{formatNumber(occupation.employedPersons, locale)}</dd>
        </div>
        <div>
          <dt className="text-[#5c6570]">{t("detail.year")}</dt>
          <dd>{occupation.employmentDataYear ?? "–"}</dd>
        </div>
        <div>
          <dt className="text-[#5c6570]">{t("detail.exposure")}</dt>
          <dd>{occupation.theoreticalAIExposure ?? t("chart.unscored")}</dd>
        </div>
        <div>
          <dt className="text-[#5c6570]">{t("detail.adoption")}</dt>
          <dd>{occupation.currentAIAdoption ?? t("chart.unscored")}</dd>
        </div>
        <div>
          <dt className="text-[#5c6570]">{t("detail.outlook")}</dt>
          <dd>{t(`outlook.${occupation.laborMarketOutlook}`)}</dd>
        </div>
        <div>
          <dt className="text-[#5c6570]">{t("detail.index")}</dt>
          <dd>{occupation.shortageSurplusIndex ?? "–"}</dd>
        </div>
      </dl>

      <ul className="mt-3 space-y-1 text-sm text-[#5c6570]">
        {occupation.employedPersons == null ? <li>{t("detail.missingEmployment")}</li> : null}
        {occupation.employmentStale ? <li>{t("detail.staleEmployment")}</li> : null}
        {occupation.laborMarketOutlook === "unavailable" ? <li>{t("detail.missingOutlook")}</li> : (
          <li>{t("detail.derivedOutlook")}</li>
        )}
        {occupation.scoreStatus === "unscored" ? <li>{t("detail.missingScore")}</li> : null}
        {occupation.scoreStatus === "fixture" ? <li>{t("detail.fixtureScore")}</li> : null}
        {!occupation.descriptionAvailable ? <li>{t("detail.noDescription")}</li> : null}
      </ul>

      {occupation.description ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{occupation.description}</p>
      ) : null}

      {occupation.exposureRationale ? (
        <section className="mt-4">
          <h3 className="font-semibold">{t("detail.exposure")}</h3>
          <p className="text-sm leading-relaxed">{occupation.exposureRationale}</p>
        </section>
      ) : null}
      {occupation.adoptionRationale ? (
        <section className="mt-3">
          <h3 className="font-semibold">{t("detail.adoption")}</h3>
          <p className="text-sm leading-relaxed">{occupation.adoptionRationale}</p>
        </section>
      ) : null}

      {occupation.humanCriticalTasks.length ? (
        <section className="mt-3">
          <h3 className="font-semibold">{t("detail.human")}</h3>
          <ul className="list-disc pl-5 text-sm">
            {occupation.humanCriticalTasks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {occupation.AIApplicableTasks.length ? (
        <section className="mt-3">
          <h3 className="font-semibold">{t("detail.ai")}</h3>
          <ul className="list-disc pl-5 text-sm">
            {occupation.AIApplicableTasks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {occupation.uncertainty ? (
        <p className="mt-3 text-sm">
          {t("detail.uncertainty")}: {t(`uncertainty.${occupation.uncertainty}`)}
        </p>
      ) : null}

      <section className="mt-4">
        <h3 className="font-semibold">{t("detail.sources")}</h3>
        <p className="text-xs text-[#5c6570]">{occupation.outlookSource}</p>
        <ul className="mt-1 list-disc pl-5 text-xs">
          {occupation.sourceUrls.map((url) => (
            <li key={url}>
              <a className="break-all text-[#0f5c5c] underline" href={url} rel="noreferrer">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { AnalysisResults } from "@/components/AnalysisResults";
import { CompareAction } from "@/components/CompareAction";
import { CuratedPath } from "@/components/CuratedPath";
import { RegionalOutlook } from "@/components/RegionalOutlook";
import { curatedProfilesForOccupation } from "@/lib/curated-view";
import { buildOccupationAnalysis } from "@/lib/analysis/build";
import type { CuratedProfile, Occupation } from "@/lib/schemas";
import { exampleOccupations } from "@/lib/occupation-view";
import { useVisualizerStore } from "@/lib/store";
import { occupationName } from "@/lib/utils";

export function DetailPanel({
  occupation,
  catalog,
  curatedProfiles = [],
}: {
  occupation: Occupation | null;
  catalog: Occupation[];
  curatedProfiles?: CuratedProfile[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const setFilters = useVisualizerStore((state) => state.setFilters);
  const examples = exampleOccupations(catalog);
  const analysis = useMemo(
    () =>
      occupation
        ? buildOccupationAnalysis({
            occupation,
            catalog,
            locale: locale === "sv" || locale === "en" ? locale : "fi",
          })
        : null,
    [occupation, catalog, locale],
  );

  if (!occupation || !analysis) {
    return (
      <aside className="rounded-lg border border-dashed border-[#d8d2c6] bg-white/60 p-4 text-sm text-[#5c6570]">
        <h2 className="font-serif text-lg text-[#0b3f3c]">{t("detail.onboardingTitle")}</h2>
        <p className="mt-2 leading-relaxed">{t("detail.onboardingBody")}</p>
        <p className="mt-3 font-semibold text-[#0b3f3c]">{t("detail.examples")}</p>
        <ul className="mt-2 space-y-2">
          {examples.map((example) => (
            <li key={example.occupationCode}>
              <button
                type="button"
                className="w-full rounded border border-[#0f5c5c] px-3 py-2 text-left text-[#0f5c5c]"
                onClick={() => setFilters({ selectedCode: example.occupationCode })}
              >
                {t("detail.openExample", { name: occupationName(example, locale) })}
                <span className="block text-xs text-[#5c6570]">{example.occupationCode}</span>
              </button>
            </li>
          ))}
        </ul>
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
        <div className="flex flex-col items-end gap-2">
          <CompareAction code={occupation.occupationCode} />
          <button
            type="button"
            className="rounded border border-[#d8d2c6] px-2 py-1 text-sm"
            onClick={() => setFilters({ selectedCode: "" })}
          >
            {t("detail.close")}
          </button>
        </div>
      </div>

      <AnalysisResults occupation={occupation} catalog={catalog} analysis={analysis} />
      <RegionalOutlook occupation={occupation} />
      {curatedProfilesForOccupation(curatedProfiles, occupation.occupationCode).map((profile) => (
        <CuratedPath key={profile.profileId} profile={profile} />
      ))}
    </aside>
  );
}

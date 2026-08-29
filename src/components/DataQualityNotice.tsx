"use client";

import { useLocale, useTranslations } from "next-intl";
import { displayValue } from "@/lib/occupation-view";
import { formatNumber } from "@/lib/utils";

export function DataQualityNotice({
  code,
  employedPersons,
  employmentDataYear,
}: {
  code: string;
  employedPersons: number | null;
  employmentDataYear: number | null;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const unavailable = t("common.unavailable");

  return (
    <aside className="rounded-lg border border-[#d8d2c6] bg-[#f7f5f0] px-3 py-2 text-sm" role="note">
      <p className="font-semibold text-[#0b3f3c]">{t("quality.unknownTitle")}</p>
      <p className="mt-1 leading-relaxed text-[#5c6570]">
        {t("quality.unknownBody", {
          count: displayValue(employedPersons, unavailable, (value) => formatNumber(Number(value), locale)),
          year: displayValue(employmentDataYear, unavailable),
          code,
        })}
      </p>
    </aside>
  );
}

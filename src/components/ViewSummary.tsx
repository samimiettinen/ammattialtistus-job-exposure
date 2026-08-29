"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatSharePercent, formatWorkers } from "@/lib/occupation-view";
import type { ViewSummary as ViewSummaryModel } from "@/lib/view-summary";

export function ViewSummary({ summary }: { summary: ViewSummaryModel }) {
  const t = useTranslations();
  const locale = useLocale();
  const workers = formatWorkers(summary.workerCount, locale);
  const workerText =
    workers.kind === "millions"
      ? t("summary.workersMillions", { value: workers.value })
      : t("summary.workersExact", { value: workers.value });
  const exposure =
    summary.highExposureShare == null
      ? t("summary.exposureUnavailable")
      : t("summary.exposureShare", { percent: formatSharePercent(summary.highExposureShare, locale) });

  return (
    <p className="rounded-lg border border-[#d8d2c6] bg-white px-3 py-2 text-sm leading-relaxed" aria-live="polite">
      {t("summary.line", { count: summary.occupationCount, workers: workerText, exposure })}
    </p>
  );
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { buildComparisonView, comparisonExportRows } from "@/lib/comparison";
import { downloadComparisonPng } from "@/lib/comparison-png";
import type { Occupation } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";
import { occupationName } from "@/lib/utils";

export function ComparisonCard({ catalog }: { catalog: Occupation[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const compareCodes = useVisualizerStore((state) => state.compareCodes);
  const toggleCompare = useVisualizerStore((state) => state.toggleCompare);
  const clearCompare = useVisualizerStore((state) => state.clearCompare);
  const [copied, setCopied] = useState(false);

  const view = useMemo(
    () =>
      buildComparisonView({
        catalog,
        codes: compareCodes,
        locale,
        nameOf: (occupation) => occupationName(occupation, locale),
        unavailable: t("common.unavailable"),
        outlookLabel: (outlook) => t(`outlook.${outlook}`),
        uncertaintyLabel: (value) => t(`uncertainty.${value}`),
      }),
    [catalog, compareCodes, locale, t],
  );

  if (compareCodes.length === 0) return null;

  const rows = comparisonExportRows(view.columns, {
    employed: t("detail.employed"),
    year: t("detail.year"),
    outlook: t("detail.outlook"),
    exposure: t("detail.exposure"),
    adoption: t("detail.adoption"),
    uncertainty: t("detail.uncertainty"),
    reasons: t("detail.reasons"),
    ai: t("detail.ai"),
    human: t("detail.human"),
    skills: t("compare.transferable"),
    sources: t("detail.sources"),
  });

  async function copyLink() {
    if (typeof window === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section
      className="comparison-card rounded-lg border border-[#0f5c5c] bg-white p-4"
      aria-labelledby="comparison-title"
    >
      <div className="no-print mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="comparison-title" className="font-serif text-xl text-[#0b3f3c]">
            {t("compare.title")}
          </h2>
          <p className="mt-1 text-sm text-[#5c6570]">{t("compare.hint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded border border-[#0f5c5c] px-3 py-1 text-sm text-[#0f5c5c]" onClick={() => window.print()}>
            {t("compare.print")}
          </button>
          {view.columns.length >= 2 ? (
            <button
              type="button"
              className="rounded border border-[#0f5c5c] px-3 py-1 text-sm text-[#0f5c5c]"
              onClick={() =>
                downloadComparisonPng({
                  title: t("compare.title"),
                  notice: t("notice"),
                  officialLabel: t("detail.official"),
                  aiLabel: t("detail.aiEstimate"),
                  columns: view.columns,
                  rows,
                })
              }
            >
              {t("compare.downloadPng")}
            </button>
          ) : null}
          <button type="button" className="rounded border border-[#0f5c5c] px-3 py-1 text-sm text-[#0f5c5c]" onClick={() => void copyLink()}>
            {copied ? t("compare.copied") : t("compare.copyLink")}
          </button>
          <button type="button" className="rounded border border-[#d8d2c6] px-3 py-1 text-sm" onClick={() => clearCompare()}>
            {t("compare.clear")}
          </button>
        </div>
      </div>

      <p className="mb-3 text-sm font-semibold text-[#8a4b12]">{t("notice")}</p>
      {compareCodes.length >= 4 ? <p className="mb-2 text-sm text-[#5c6570]">{t("compare.max")}</p> : null}
      {view.missing.map((code) => (
        <p key={code} className="text-sm text-[#5c6570]">
          {t("compare.missing", { code })}
        </p>
      ))}

      {compareCodes.length === 1 ? (
        <p className="text-sm text-[#5c6570]">{t("compare.needTwo")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-[#d8d2c6] p-2 text-left font-semibold">{t("compare.metric")}</th>
                {view.columns.map((col) => (
                  <th key={col.code} className="border-b border-[#d8d2c6] p-2 text-left align-top">
                    <p className="font-mono text-xs text-[#5c6570]">{col.code}</p>
                    <p className="text-[#0b3f3c]">{col.name}</p>
                    <button
                      type="button"
                      className="no-print mt-1 text-xs text-[#0f5c5c] underline"
                      onClick={() => toggleCompare(col.code)}
                    >
                      {t("compare.remove")}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-[#f3f8f7]">
                <th className="p-2 text-left text-xs uppercase tracking-wide text-[#0b3f3c]" colSpan={view.columns.length + 1}>
                  {t("detail.official")}
                </th>
              </tr>
              {rows.slice(0, 3).map((row) => (
                <tr key={row.key}>
                  <th className="border-t border-[#efe9de] p-2 text-left font-normal text-[#5c6570]">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={`${row.key}-${view.columns[index]?.code}`} className="border-t border-[#efe9de] p-2">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-[#fff8ee]">
                <th className="p-2 text-left text-xs uppercase tracking-wide text-[#8a4b12]" colSpan={view.columns.length + 1}>
                  {t("detail.aiEstimate")}
                </th>
              </tr>
              {rows.slice(3).map((row) => (
                <tr key={row.key}>
                  <th className="border-t border-[#efe9de] p-2 text-left font-normal text-[#5c6570]">{row.label}</th>
                  {row.values.map((value, index) => (
                    <td key={`${row.key}-${view.columns[index]?.code}`} className="border-t border-[#efe9de] p-2">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { CompareAction } from "@/components/CompareAction";
import type { Occupation } from "@/lib/schemas";
import { useVisualizerStore } from "@/lib/store";
import { occupationName } from "@/lib/utils";

export function SearchResults({ occupations }: { occupations: Occupation[] }) {
  const t = useTranslations();
  const locale = useLocale();
  const q = useVisualizerStore((state) => state.q);
  const setFilters = useVisualizerStore((state) => state.setFilters);
  if (!q.trim()) return null;

  const rows = occupations.slice(0, 12);
  return (
    <section className="rounded-lg border border-[#0f5c5c] bg-white p-3" aria-label={t("compare.searchResults")}>
      <h2 className="text-sm font-semibold text-[#0b3f3c]">{t("compare.searchResults")}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-[#5c6570]">{t("compare.noSearchResults")}</p>
      ) : (
        <ul className="mt-2 divide-y divide-[#efe9de]">
          {rows.map((row) => (
            <li key={row.occupationCode} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <button
                type="button"
                className="text-left text-sm text-[#0b3f3c] underline-offset-2 hover:underline"
                onClick={() => setFilters({ selectedCode: row.occupationCode })}
              >
                <span className="font-mono text-xs text-[#5c6570]">{row.occupationCode}</span>{" "}
                {occupationName(row, locale)}
              </button>
              <CompareAction code={row.occupationCode} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

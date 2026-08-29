"use client";

import { useTranslations } from "next-intl";

export type ProvenanceKind = "official" | "ai" | "user" | "unavailable" | "calculated" | "computed";

/**
 * The one label that keeps official statistics and AI estimates visibly apart.
 * Every block that shows a number carries one.
 */
export function ProvenanceTag({ kind }: { kind: ProvenanceKind }) {
  const t = useTranslations();
  const label = {
    official: t("analysis.sourceOfficial"),
    ai: t("analysis.sourceAi"),
    user: t("analysis.sourceUser"),
    unavailable: t("analysis.sourceUnavailable"),
    calculated: t("analysis.sourceCalculated"),
    computed: t("analysis.sourceComputed"),
  }[kind];
  return (
    <span className="rounded bg-[#efe9de] px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-[#5c6570]">
      {label}
    </span>
  );
}

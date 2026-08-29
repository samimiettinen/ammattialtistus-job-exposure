"use client";

import { useTranslations } from "next-intl";
import { useVisualizerStore } from "@/lib/store";

export function CompareAction({
  code,
  compact = false,
}: {
  code: string;
  compact?: boolean;
}) {
  const t = useTranslations();
  const compareCodes = useVisualizerStore((state) => state.compareCodes);
  const toggleCompare = useVisualizerStore((state) => state.toggleCompare);
  const selected = compareCodes.includes(code);
  const blocked = !selected && compareCodes.length >= 4;

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={blocked}
      className={`rounded border px-2 py-1 text-sm ${
        selected
          ? "border-[#0f5c5c] bg-[#0f5c5c] text-white"
          : "border-[#0f5c5c] text-[#0f5c5c] disabled:opacity-40"
      }`}
      onClick={() => toggleCompare(code)}
    >
      {compact ? t("compare.action") : selected ? t("compare.added") : t("compare.action")}
    </button>
  );
}

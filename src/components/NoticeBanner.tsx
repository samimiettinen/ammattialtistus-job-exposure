"use client";

import { useTranslations } from "next-intl";

export function NoticeBanner() {
  const t = useTranslations();
  return (
    <p
      role="note"
      className="border-b border-[#e6d3b8] bg-[#f8ead6] px-4 py-3 text-center text-base font-semibold text-[#8a4b12] md:text-lg"
    >
      {t("notice")}
    </p>
  );
}

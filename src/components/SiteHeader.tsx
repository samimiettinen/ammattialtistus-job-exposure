"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const LOCALES = [
  { id: "fi", label: "Suomi" },
  { id: "sv", label: "Svenska" },
  { id: "en", label: "English" },
] as const;

export function SiteHeader() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <header className="border-b border-[#d8d2c6] bg-[#f4f1ea]">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/" className="text-xl font-semibold text-[#0b3f3c]">
            {t("brand.name")}
          </Link>
          <p className="text-sm text-[#5c6570]">{t("brand.tagline")}</p>
        </div>
        <nav aria-label="Päänavigaatio" className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/" className="underline-offset-4 hover:underline">
            {t("nav.visualizer")}
          </Link>
          <Link href="/methodology" className="underline-offset-4 hover:underline">
            {t("nav.methodology")}
          </Link>
          <div className="flex items-center gap-2" role="group" aria-label={t("nav.language")}>
            {LOCALES.map((item) => (
              <Link
                key={item.id}
                href={pathname}
                locale={item.id}
                className={`rounded px-2 py-1 ${
                  locale === item.id ? "bg-[#0f5c5c] text-white" : "text-[#0f5c5c]"
                }`}
                hrefLang={item.id}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}

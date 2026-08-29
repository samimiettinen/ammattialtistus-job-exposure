"use client";

import { useTranslations } from "next-intl";
import { ProvenanceTag } from "@/components/ProvenanceTag";
import type { Occupation } from "@/lib/schemas";
import { buildSourceLinks } from "@/lib/source-links";

/**
 * Official sources for the selected occupation, as labelled links.
 * Only URLs recorded on the record are shown — never a constructed deep link.
 */
export function SourceLinks({ occupation }: { occupation: Occupation }) {
  const t = useTranslations();
  const links = buildSourceLinks(occupation);

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-[#0b3f3c]">{t("sources.title")}</h4>
        <ProvenanceTag kind={links.length ? "official" : "unavailable"} />
      </div>
      <p className="mt-1 text-xs text-[#5c6570]">{t("sources.lead")}</p>
      {links.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {links.map((link) => (
            <li key={link.url}>
              <a
                className="text-[#0f5c5c] underline"
                href={link.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {link.labelKey ? t(`sources.label.${link.labelKey}`) : link.host}
              </a>
              <span className="block break-all text-xs text-[#5c6570]">{link.url}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#5c6570]">{t("sources.empty")}</p>
      )}
    </div>
  );
}

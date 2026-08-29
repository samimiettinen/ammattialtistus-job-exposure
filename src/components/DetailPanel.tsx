"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Occupation } from "@/lib/schemas";
import { buildOccupationDetailModel, exampleOccupations } from "@/lib/occupation-view";
import { useVisualizerStore } from "@/lib/store";
import { occupationName } from "@/lib/utils";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[#5c6570]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ItemList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function DetailPanel({
  occupation,
  catalog,
}: {
  occupation: Occupation | null;
  catalog: Occupation[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const setFilters = useVisualizerStore((state) => state.setFilters);
  const examples = exampleOccupations(catalog);

  if (!occupation) {
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

  const model = buildOccupationDetailModel(occupation, {
    locale,
    unavailable: t("common.unavailable"),
    outlookLabel: t(`outlook.${occupation.laborMarketOutlook}`),
    uncertaintyLabel: occupation.uncertainty ? t(`uncertainty.${occupation.uncertainty}`) : null,
  });

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
        <button
          type="button"
          className="rounded border border-[#d8d2c6] px-2 py-1 text-sm"
          onClick={() => setFilters({ selectedCode: "" })}
        >
          {t("detail.close")}
        </button>
      </div>

      <section className="rounded border border-[#c9ddd8] bg-[#f3f8f7] p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#0b3f3c]">{t("detail.official")}</h3>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <Field label={t("detail.employed")} value={model.official.employed} />
          <Field label={t("detail.year")} value={model.official.year} />
          <Field label={t("detail.outlook")} value={model.official.outlook} />
          <Field label={t("detail.index")} value={model.official.index} />
        </dl>
        <ul className="mt-3 space-y-1 text-sm text-[#5c6570]">
          {model.official.employmentMissing ? <li>{t("detail.missingEmployment")}</li> : null}
          {occupation.employmentStale ? <li>{t("detail.staleEmployment")}</li> : null}
          {model.official.outlookMissing ? <li>{t("detail.missingOutlook")}</li> : <li>{t("detail.derivedOutlook")}</li>}
          {!occupation.descriptionAvailable ? <li>{t("detail.noDescription")}</li> : null}
        </ul>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{model.official.description}</p>
      </section>

      <section className="mt-4 rounded border border-[#e6d3b8] bg-[#fff8ee] p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#8a4b12]">{t("detail.aiEstimate")}</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#8a4b12]">{t("detail.aiEstimateHint")}</p>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <Field label={t("detail.exposure")} value={model.ai.exposure} />
          <Field label={t("detail.adoption")} value={model.ai.adoption} />
          <Field label={t("detail.uncertainty")} value={model.ai.uncertainty} />
        </dl>
        <ul className="mt-3 space-y-1 text-sm text-[#5c6570]">
          {model.ai.status === "unscored" ? <li>{t("detail.missingScore")}</li> : null}
          {model.ai.status === "fixture" ? <li>{t("detail.fixtureScore")}</li> : null}
        </ul>

        <div className="mt-3">
          <h4 className="font-semibold">{t("detail.reasons")}</h4>
          <ItemList items={model.ai.reasons} />
        </div>
        <div className="mt-3">
          <h4 className="font-semibold">{t("detail.ai")}</h4>
          <ItemList items={model.ai.aiTasks} />
        </div>
        <div className="mt-3">
          <h4 className="font-semibold">{t("detail.human")}</h4>
          <ItemList items={model.ai.humanTasks} />
        </div>
        <div className="mt-3">
          <h4 className="font-semibold">{t("detail.skills")}</h4>
          <ItemList items={model.ai.skills} />
        </div>

        <dl className="mt-4 grid gap-2 text-xs text-[#5c6570]">
          <Field label={t("detail.scoredAt")} value={model.ai.scoredAt} />
          <Field label={t("detail.model")} value={model.ai.scoringModel} />
          <Field label={t("detail.prompt")} value={model.ai.promptVersion} />
        </dl>
      </section>

      <section className="mt-4">
        <h3 className="font-semibold">{t("detail.sources")}</h3>
        <p className="text-xs text-[#5c6570]">{model.outlookSource}</p>
        <ul className="mt-1 list-disc pl-5 text-xs">
          {model.sources.map((url) => (
            <li key={url}>
              <a className="break-all text-[#0f5c5c] underline" href={url} rel="noreferrer">
                {url}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

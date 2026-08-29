"use client";

import { useLocale, useTranslations } from "next-intl";
import { CareerBridges } from "@/components/CareerBridges";
import { ProvenanceTag } from "@/components/ProvenanceTag";
import { SourceLinks } from "@/components/SourceLinks";
import type { BuiltAnalysis } from "@/lib/analysis/build";
import { humanCoreForOccupation } from "@/lib/human-core";
import { displayValue } from "@/lib/occupation-view";
import type { Occupation } from "@/lib/schemas";
import type { WorkdayResponse } from "@/lib/schemas/workday";
import { skillLabel } from "@/lib/skills/normalize";

const TASK_KEYS = {
  accelerate: "workday.accelerate",
  assist: "workday.assist",
  human: "workday.human",
  insufficient: "workday.insufficient",
} as const;

export function AnalysisResults({
  occupation,
  catalog,
  analysis,
  workday,
}: {
  occupation: Occupation;
  catalog: Occupation[];
  analysis: BuiltAnalysis;
  workday?: WorkdayResponse | null;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const unavailable = t("common.unavailable");
  const humanCore = humanCoreForOccupation(occupation, workday?.tasks);

  return (
    <div className="space-y-4">
      <section className="rounded border border-[#0f5c5c] bg-[#f3f8f7] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg text-[#0b3f3c]">{t("analysis.situation")}</h3>
          <ProvenanceTag kind="calculated" />
        </div>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#0f5c5c]">
          {t(`analysis.category.${analysis.situation.category}`)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#1c2430]">{analysis.situation.summary}</p>
        <div className="mt-3">
          <h4 className="text-sm font-semibold">{t("analysis.why")}</h4>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {analysis.situation.why.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="mt-3">
          <h4 className="text-sm font-semibold">{t("analysis.missing")}</h4>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {(analysis.situation.missingEvidence.length ? analysis.situation.missingEvidence : [unavailable]).map(
              (item) => (
                <li key={item}>{item}</li>
              ),
            )}
          </ul>
        </div>
      </section>

      <section className="rounded border border-[#d8d2c6] bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-[#0b3f3c]">{t("analysis.evidence")}</h3>
          <ProvenanceTag kind={analysis.coverage.fields.officialOutlook.status === "unavailable" ? "unavailable" : "official"} />
        </div>
        {analysis.analysisStale ? <p className="mt-2 text-sm text-[#8a4b12]">{t("analysis.stale")}</p> : null}
        <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-[#5c6570]">{t("detail.employed")}</dt>
            <dd>
              {displayValue(occupation.employedPersons, unavailable)}{" "}
              <ProvenanceTag kind={occupation.employedPersons == null ? "unavailable" : "official"} />
            </dd>
          </div>
          <div>
            <dt className="text-[#5c6570]">{t("detail.outlook")}</dt>
            <dd>
              {occupation.laborMarketOutlook === "unavailable"
                ? unavailable
                : t(`outlook.${occupation.laborMarketOutlook}`)}{" "}
              <ProvenanceTag kind={occupation.laborMarketOutlook === "unavailable" ? "unavailable" : "official"} />
            </dd>
          </div>
          <div>
            <dt className="text-[#5c6570]">{t("detail.exposure")}</dt>
            <dd>
              {displayValue(occupation.theoreticalAIExposure, unavailable)}{" "}
              <ProvenanceTag kind={occupation.theoreticalAIExposure == null ? "unavailable" : "ai"} />
            </dd>
          </div>
          <div>
            <dt className="text-[#5c6570]">{t("detail.uncertainty")}</dt>
            <dd>
              {occupation.uncertainty ? t(`uncertainty.${occupation.uncertainty}`) : unavailable}{" "}
              <ProvenanceTag kind={occupation.uncertainty ? "ai" : "unavailable"} />
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-[#5c6570]">
          {t("analysis.completeness")}: {Math.round(analysis.coverage.completeness * 100)} %
        </p>
        {analysis.coverage.fields.skills.status === "inferred_from_tasks" ? (
          <p className="mt-1 text-xs text-[#8a4b12]">{t("analysis.inferredSkills")}</p>
        ) : null}
        {occupation.scoreStatus === "fixture" || workday?.fixture ? (
          <p className="mt-1 text-xs text-[#8a4b12]">{t("analysis.fixture")}</p>
        ) : null}
        {workday ? (
          <p className="mt-1 text-xs text-[#5c6570]">
            <ProvenanceTag kind="user" /> {t("workday.privacy")}
          </p>
        ) : null}
      </section>

      <section className="rounded border border-[#d8d2c6] bg-white p-3">
        <h3 className="font-semibold text-[#0b3f3c]">{t("analysis.capabilities")}</h3>
        {analysis.capabilities.length ? (
          <ul className="mt-2 space-y-2 text-sm">
            {analysis.capabilities.map((item) => (
              <li key={item.skill.id}>
                <span className="font-semibold">{skillLabel(item.skill, locale)}</span>{" "}
                <span className="text-xs text-[#5c6570]">{t(`analysis.skillCategory.${item.skill.category}`)}</span>
                <p className="text-xs text-[#5c6570]">{item.why}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[#5c6570]">{t("analysis.noCapabilities")}</p>
        )}
      </section>

      <section className="rounded border border-[#e6d3b8] bg-[#fff8ee] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-[#8a4b12]">{t("analysis.tasks")}</h3>
          <ProvenanceTag kind="ai" />
        </div>
        {humanCore.available ? (
          <>
            <div className="mt-2 rounded border border-[#0f5c5c] bg-[#f3f8f7] p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-semibold text-[#0b3f3c]">{t("analysis.humanCore")}</h4>
                <ProvenanceTag kind="computedTasks" />
              </div>
              <p className="mt-1 text-sm">
                {t("analysis.humanShare", {
                  human: humanCore.humanCount,
                  total: humanCore.totalCount,
                })}
              </p>
              <p className="mt-1 text-xs text-[#5c6570]">{t("analysis.humanCoreNote")}</p>
            </div>
            {humanCore.groups.map((group) => (
              <div key={group.classification} className="mt-3">
                <h4 className="text-sm font-semibold">
                  {t(TASK_KEYS[group.classification])}{" "}
                  <span className="font-normal text-xs text-[#5c6570]">
                    ({t("analysis.taskGroupCount", { count: group.tasks.length })})
                  </span>
                </h4>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {group.tasks.map((text) => (
                    <li key={`${group.classification}-${text}`}>{text}</li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        ) : (
          <>
            <p className="mt-2 text-sm">{unavailable}</p>
            <p className="mt-1 text-xs text-[#5c6570]">{t("analysis.humanShareUnavailable")}</p>
          </>
        )}
      </section>

      <CareerBridges occupation={occupation} catalog={catalog} result={analysis.bridges} />

      <section className="rounded border border-[#0f5c5c] bg-white p-3">
        <h3 className="font-semibold text-[#0b3f3c]">{t("analysis.actions")}</h3>
        <ol className="mt-2 space-y-3">
          {analysis.actions.map((action, index) => (
            <li key={action.id} className="rounded border border-[#efe9de] p-2 text-sm">
              <p className="font-semibold">
                {index + 1}. {action.title}
              </p>
              <p className="mt-1">{action.detail}</p>
              <p className="mt-1 text-xs text-[#5c6570]">
                {t("analysis.why")}: {action.why}
              </p>
              <p className="mt-1 text-xs text-[#5c6570]">
                {t("analysis.missing")}:{" "}
                {action.missingEvidence.length ? action.missingEvidence.join(" · ") : unavailable}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <details className="rounded border border-[#d8d2c6] bg-white p-3">
        <summary className="cursor-pointer font-semibold text-[#0b3f3c]">{t("analysis.methodology")}</summary>
        <p className="mt-2 text-sm leading-relaxed">{t("analysis.methodologySummary")}</p>
        <p className="mt-2 text-xs text-[#5c6570]">{t("bridges.weights")}</p>
        <p className="mt-2 text-xs text-[#5c6570]">{occupation.outlookSource || unavailable}</p>
        <SourceLinks occupation={occupation} />
      </details>
    </div>
  );
}

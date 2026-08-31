"use client";

import { useTranslations } from "next-intl";
import { ProvenanceTag } from "@/components/ProvenanceTag";
import { isAxisStale, isValidated, renderableSources } from "@/lib/curated-view";
import type { CuratedAxis, CuratedProfile, CuratedTask } from "@/lib/schemas";

/**
 * Curated golden-set path for an occupation.
 *
 * This is deliberately its OWN surface, not part of the situation card. The
 * deterministic analysis caps next actions at three from five allowed kinds and
 * forbids generic reskilling catalogues; folding curated content into it would
 * either break that cap or gut the content. Keeping them apart also keeps the
 * "exposure alone never triggers a career-change category" gate auditable.
 *
 * Nothing here feeds back into the occupation's official figures or its 0–10
 * exposure scores.
 */

function AxisValue({
  axis,
  stale,
  label,
  t,
}: {
  axis: CuratedAxis;
  stale: boolean;
  label: string;
  t: (key: string) => string;
}) {
  return (
    <div className="flex-1">
      <p className="text-xs uppercase tracking-wide text-[#5c6570]">
        {label} <span className="normal-case">({t("curated.axisScale")})</span>
      </p>
      <p className="text-lg font-semibold tabular-nums text-[#1c2430]">
        {axis.value ?? t("common.unavailable")}
        {stale ? <span className="ml-2 text-xs font-normal text-[#8a4b12]">{t("curated.staleAxis")}</span> : null}
      </p>
      {axis.why ? (
        <p className="mt-1 text-xs leading-relaxed text-[#5c6570]">
          <span className="font-semibold">{t("curated.why")}:</span> {axis.why}
        </p>
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  intervalMonths,
  t,
}: {
  task: CuratedTask;
  intervalMonths: number | null;
  t: (key: string) => string;
}) {
  return (
    <li className="rounded border border-[#efe9de] bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-[#5c6570]">{task.taskId}</p>
          <h5 className="font-semibold text-[#0b3f3c]">{task.titleFi}</h5>
        </div>
        <ProvenanceTag kind={isValidated(task) ? "curated" : "curatedDraft"} />
      </div>
      <p className="mt-1 text-sm leading-relaxed">{task.descriptionFi}</p>
      <div className="mt-3 flex flex-wrap gap-4">
        <AxisValue
          axis={task.aiAssistance}
          stale={isAxisStale(task.aiAssistance, intervalMonths)}
          label={t("curated.aiAxis")}
          t={t}
        />
        <AxisValue
          axis={task.humanCriticality}
          stale={false}
          label={t("curated.humanAxis")}
          t={t}
        />
      </div>
    </li>
  );
}

export function CuratedPath({ profile }: { profile: CuratedProfile }) {
  const t = useTranslations();
  const validated = isValidated(profile);
  const sources = renderableSources(profile.sources);
  const withBoth = profile.tasks.filter(
    (task) => task.aiAssistance.value != null && task.humanCriticality.value != null,
  ).length;
  const validatedTasks = profile.tasks.filter(isValidated).length;

  return (
    <section
      className="mt-4 rounded border border-[#0f5c5c] bg-[#f3f8f7] p-3"
      aria-labelledby={`curated-${profile.profileId}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`curated-${profile.profileId}`} className="font-serif text-lg text-[#0b3f3c]">
          {t("curated.title")}: {profile.nameFi}
        </h3>
        <ProvenanceTag kind={validated ? "curated" : "curatedDraft"} />
      </div>
      <p className="mt-1 text-xs text-[#5c6570]">{t("curated.lead")}</p>
      <p className="mt-2 text-xs text-[#8a4b12]">{t("curated.notOfficial")}</p>
      <p className="mt-1 text-xs text-[#8a4b12]">
        {validated
          ? t("curated.validatedNotice", { count: profile.validatedBy })
          : t("curated.draftNotice")}
      </p>

      <p className="mt-3 text-sm leading-relaxed">{profile.descriptionFi}</p>
      <p className="mt-2 text-xs text-[#5c6570]">{t("curated.axesIndependent")}</p>

      <dl className="mt-3 grid grid-cols-1 gap-1 text-xs text-[#5c6570] sm:grid-cols-2">
        <div>
          <dt className="inline font-semibold">{t("curated.coverage")}: </dt>
          <dd className="inline">
            {t("curated.coverageAxes", { withBoth, total: profile.tasks.length })}{" "}
            {t("curated.coverageValidated", { count: validatedTasks, total: profile.tasks.length })}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold">{t("curated.anchors")}: </dt>
          <dd className="inline">
            {profile.anchors
              .map(
                (anchor) =>
                  `${anchor.occupationCode} (${
                    anchor.strength === "primary" ? t("curated.anchorPrimary") : t("curated.anchorSecondary")
                  })`,
              )
              .join(", ")}
          </dd>
        </div>
      </dl>

      {profile.panel.aiReviewIntervalMonths ? (
        <p className="mt-1 text-xs text-[#5c6570]">
          {t("curated.axisReviewInterval", { months: profile.panel.aiReviewIntervalMonths })}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-[#5c6570]">{t("curated.contentLanguage")}</p>

      {profile.modules.map((module) => {
        const tasks = profile.tasks.filter((task) => task.moduleId === module.moduleId);
        if (!tasks.length) return null;
        const heading = (
          <>
            {module.nameFi}{" "}
            <span className="font-normal text-xs text-[#5c6570]">
              {module.kind === "core" ? `· ${t("curated.coreModule")} · ` : "· "}
              {t("curated.taskCount", { count: tasks.length })}
            </span>
          </>
        );
        const list = (
          <ul className="mt-2 space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.taskId}
                task={task}
                intervalMonths={profile.panel.aiReviewIntervalMonths}
                t={t}
              />
            ))}
          </ul>
        );

        // Core tasks apply to everyone and stay open. The path modules are
        // alternatives, so they collapse — until the guided form selects one,
        // opening all 24 cards at once buries the reader.
        if (module.kind === "core") {
          return (
            <div key={module.moduleId} className="mt-4">
              <h4 className="text-sm font-semibold text-[#0b3f3c]">{heading}</h4>
              {list}
            </div>
          );
        }
        return (
          <details key={module.moduleId} className="mt-3 rounded border border-[#d8d2c6] bg-white/70 p-2">
            <summary className="cursor-pointer text-sm font-semibold text-[#0b3f3c]">{heading}</summary>
            {list}
          </details>
        );
      })}

      <details className="mt-4 rounded border border-[#d8d2c6] bg-white p-3">
        <summary className="cursor-pointer text-sm font-semibold text-[#0b3f3c]">
          {t("curated.panel")}
        </summary>
        <ul className="mt-2 list-disc pl-5 text-xs">
          {[...profile.panel.mainPanel, ...profile.panel.supplementaryPanel].map((member) => (
            <li key={member}>{member}</li>
          ))}
        </ul>
        {profile.panel.disagreementRuleFi ? (
          <p className="mt-2 text-xs text-[#5c6570]">{profile.panel.disagreementRuleFi}</p>
        ) : null}
        {profile.critiqueLog.length ? (
          <>
            <h5 className="mt-3 text-sm font-semibold text-[#0b3f3c]">{t("curated.critiqueLog")}</h5>
            <ul className="mt-1 space-y-1 text-xs">
              {profile.critiqueLog.map((round) => (
                <li key={round.round}>
                  <span className="font-semibold">
                    {t("curated.round", { round: round.round })}: {round.outcome}
                  </span>
                  {round.findingFi ? <span> — {round.findingFi}</span> : null}
                  {round.resolutionFi ? <span> {round.resolutionFi}</span> : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {sources.length ? (
          <ul className="mt-3 space-y-1 text-xs">
            {sources.map((source) => (
              <li key={source.url}>
                <a className="text-[#0f5c5c] underline" href={source.url} target="_blank" rel="noreferrer noopener">
                  {source.label}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-[#8a4b12]">{t("curated.noRenderableSources")}</p>
        )}
      </details>
    </section>
  );
}

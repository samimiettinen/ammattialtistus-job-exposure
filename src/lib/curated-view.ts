import {
  curatedCoverageSchema,
  CURATED_UI_FORBIDDEN_HOSTS,
  type CuratedAxis,
  type CuratedCoverage,
  type CuratedProfile,
  type CuratedSource,
  type CuratedTask,
} from "./schemas/curated";
import type { Occupation } from "./schemas";

/**
 * Pure helpers over curated profiles.
 *
 * Deliberately free of `node:fs` and `node:path` so a client component can
 * import it. The disk loader lives in `src/lib/curated.ts`, which is
 * server-only. `tests/curated.test.ts` guards this split, the same way
 * `tests/human-core-sources.test.ts` guards `source-links.ts`.
 */

/**
 * A curated AI-assistance score is re-reviewed on the profile's own interval,
 * because tool capability moves faster than the rest of the card. Past that,
 * the axis is shown as stale — the same treatment official figures already get
 * through `employmentStale` / `outlookStale`.
 */
export const CURATED_AI_AXIS_DEFAULT_INTERVAL_MONTHS = 12;

export function curatedProfilesForOccupation(
  profiles: CuratedProfile[],
  occupationCode: string,
): CuratedProfile[] {
  return profiles.filter((profile) =>
    profile.anchors.some((anchor) => anchor.occupationCode === occupationCode),
  );
}

export function tasksForModules(profile: CuratedProfile, moduleIds: string[]): CuratedTask[] {
  const core = profile.modules.filter((m) => m.kind === "core").map((m) => m.moduleId);
  const selected = new Set([...core, ...moduleIds]);
  return profile.tasks.filter((task) => selected.has(task.moduleId));
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/**
 * True when the axis carries a value whose review date is older than the
 * profile's re-review interval. An axis with no value is not stale — it is
 * simply absent, and must render as unavailable rather than as an old score.
 */
export function isAxisStale(
  axis: CuratedAxis,
  intervalMonths: number | null,
  now = new Date(),
): boolean {
  if (axis.value == null) return false;
  if (!axis.reviewedAt) return true;
  const reviewed = new Date(`${axis.reviewedAt}T00:00:00Z`);
  if (Number.isNaN(reviewed.getTime())) return true;
  const limit = intervalMonths ?? CURATED_AI_AXIS_DEFAULT_INTERVAL_MONTHS;
  return monthsBetween(reviewed, now) > limit;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function forbiddenInUi(source: CuratedSource): boolean {
  const host = hostOf(source.url);
  return CURATED_UI_FORBIDDEN_HOSTS.some((banned) => host === banned || host.endsWith(`.${banned}`));
}

/**
 * Sources safe to render. A `site`-precision reference is kept out, because it
 * does not anchor the card it would appear under — the source material's own
 * critique log flagged that weakness in its ESCO reference, and presenting it
 * as an anchor would repeat the error rather than record it.
 */
export function renderableSources(sources: CuratedSource[]): CuratedSource[] {
  return sources.filter((source) => !forbiddenInUi(source) && source.precision !== "site");
}

/** A profile or task is only "validated" when a panel actually reviewed it. */
export function isValidated(item: { status: string; validatedBy: number }): boolean {
  return item.status === "panel_reviewed" && item.validatedBy >= 1;
}

/**
 * Structural gate. These are integrity errors, not style: each one would let
 * unvalidated or mislabelled editorial content present itself as something it
 * is not.
 */
export function curatedIntegrityErrors(profile: CuratedProfile): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const moduleIds = new Set(profile.modules.map((m) => m.moduleId));

  if (profile.status === "panel_reviewed" && profile.validatedBy < 1) {
    errors.push(`${profile.profileId}: panel_reviewed without a reviewer`);
  }
  if (profile.status === "panel_reviewed" && !profile.reviewedAt) {
    errors.push(`${profile.profileId}: panel_reviewed without reviewedAt`);
  }
  for (const source of profile.sources) {
    if (forbiddenInUi(source)) {
      errors.push(`${profile.profileId}: forbidden UI source host ${hostOf(source.url)}`);
    }
  }

  for (const task of profile.tasks) {
    if (seen.has(task.taskId)) errors.push(`${profile.profileId}: duplicate taskId ${task.taskId}`);
    seen.add(task.taskId);
    if (!moduleIds.has(task.moduleId)) {
      errors.push(`${profile.profileId}/${task.taskId}: unknown moduleId ${task.moduleId}`);
    }
    if (task.status === "panel_reviewed" && task.validatedBy < 1) {
      errors.push(`${profile.profileId}/${task.taskId}: panel_reviewed without a reviewer`);
    }
    // A score with no reasoning is an unsupported assertion, which is exactly
    // what this data class must never ship.
    if (task.aiAssistance.value != null && !task.aiAssistance.why) {
      errors.push(`${profile.profileId}/${task.taskId}: aiAssistance value without why`);
    }
    if (task.humanCriticality.value != null && !task.humanCriticality.why) {
      errors.push(`${profile.profileId}/${task.taskId}: humanCriticality value without why`);
    }
    for (const source of task.sources) {
      if (forbiddenInUi(source)) {
        errors.push(`${profile.profileId}/${task.taskId}: forbidden UI source host ${hostOf(source.url)}`);
      }
    }
  }
  return errors;
}

export function buildCuratedCoverage(
  profile: CuratedProfile,
  catalog: Occupation[],
  now = new Date(),
): CuratedCoverage {
  const codes = new Set(catalog.map((row) => row.occupationCode));
  const unresolved = profile.anchors
    .filter((anchor) => !codes.has(anchor.occupationCode))
    .map((anchor) => anchor.occupationCode);

  const withAi = profile.tasks.filter((t) => t.aiAssistance.value != null);
  const withHuman = profile.tasks.filter((t) => t.humanCriticality.value != null);
  const withBoth = profile.tasks.filter(
    (t) => t.aiAssistance.value != null && t.humanCriticality.value != null,
  );
  const staleAi = profile.tasks.filter((t) =>
    isAxisStale(t.aiAssistance, profile.panel.aiReviewIntervalMonths, now),
  );

  const errors = [...curatedIntegrityErrors(profile)];
  const warnings: string[] = [];
  if (unresolved.length) {
    errors.push(`${profile.profileId}: anchors not in catalog: ${unresolved.join(", ")}`);
  }
  if (withBoth.length < profile.tasks.length) {
    warnings.push(`${profile.profileId}: ${profile.tasks.length - withBoth.length} tasks lack a full axis pair`);
  }
  if (!isValidated(profile)) {
    warnings.push(`${profile.profileId}: unvalidated draft`);
  }

  return curatedCoverageSchema.parse({
    profileId: profile.profileId,
    taskCount: profile.tasks.length,
    withAiAssistance: withAi.length,
    withHumanCriticality: withHuman.length,
    withBothAxes: withBoth.length,
    withPanelScores: profile.tasks.filter((t) => t.panelScores != null).length,
    validatedTaskCount: profile.tasks.filter(isValidated).length,
    staleAiAxisCount: staleAi.length,
    axisCompleteness: profile.tasks.length ? withBoth.length / profile.tasks.length : null,
    anchorsResolved: profile.anchors.length - unresolved.length,
    anchorsUnresolved: unresolved,
    errors,
    warnings,
    ok: errors.length === 0,
  });
}

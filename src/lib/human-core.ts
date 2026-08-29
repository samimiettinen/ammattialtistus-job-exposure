import type { Occupation, TaskClassification, WorkdayTask } from "./schemas";

/**
 * "What remains human" for an occupation that already has task lists.
 *
 * This groups an existing task list; it never scores, never infers a task that
 * is not listed, and never turns an empty list into a zero. The share it
 * reports is the composition of the list itself — not a share of working time,
 * and not a statement about whether a job is retained.
 */

/** Human work leads, because exposure is not the story this product tells. */
export const TASK_GROUP_ORDER: TaskClassification[] = [
  "human",
  "assist",
  "accelerate",
  "insufficient",
];

export type TaskGroup = {
  classification: TaskClassification;
  tasks: string[];
};

export type HumanCore = {
  groups: TaskGroup[];
  humanCount: number;
  totalCount: number;
  /** humanCount / totalCount, null when there is no task list to divide. */
  humanShare: number | null;
  available: boolean;
};

/**
 * The occupation's own task lists, as scored offline. `AIApplicableTasks` are
 * tasks AI may accelerate; `humanCriticalTasks` are the ones kept with a person.
 */
export function tasksFromOccupation(occupation: Occupation): WorkdayTask[] {
  return [
    ...occupation.humanCriticalTasks.map((text) => ({ text, classification: "human" as const })),
    ...occupation.AIApplicableTasks.map((text) => ({ text, classification: "accelerate" as const })),
  ];
}

export function buildHumanCore(tasks: WorkdayTask[]): HumanCore {
  const byClass = new Map<TaskClassification, string[]>();
  for (const task of tasks) {
    const list = byClass.get(task.classification) ?? [];
    list.push(task.text);
    byClass.set(task.classification, list);
  }

  const groups = TASK_GROUP_ORDER.map((classification) => ({
    classification,
    tasks: byClass.get(classification) ?? [],
  })).filter((group) => group.tasks.length > 0);

  const humanCount = byClass.get("human")?.length ?? 0;
  const totalCount = tasks.length;

  return {
    groups,
    humanCount,
    totalCount,
    humanShare: totalCount > 0 ? humanCount / totalCount : null,
    available: totalCount > 0,
  };
}

export function humanCoreForOccupation(
  occupation: Occupation,
  workdayTasks?: WorkdayTask[] | null,
): HumanCore {
  return buildHumanCore(workdayTasks?.length ? workdayTasks : tasksFromOccupation(occupation));
}

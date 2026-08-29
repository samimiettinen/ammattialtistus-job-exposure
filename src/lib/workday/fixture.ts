import type { Occupation } from "../schemas";
import type { WorkdayLlmOutput } from "../schemas/workday";

export function fixtureWorkdayAnalysis(occupation: Occupation): WorkdayLlmOutput {
  const tasks: WorkdayLlmOutput["tasks"] = [];
  for (const text of occupation.AIApplicableTasks) {
    tasks.push({ text, classification: "accelerate" });
  }
  for (const text of occupation.humanCriticalTasks) {
    tasks.push({ text, classification: "human" });
  }
  if (occupation.exposureRationale) {
    tasks.push({ text: occupation.exposureRationale.split(".")[0] || occupation.occupationNameFi, classification: "assist" });
  }
  let pad = 1;
  while (tasks.length < 8) {
    tasks.push({
      text: `Kuvauksesta ei voi erottaa lisätehtävää ${pad}`,
      classification: "insufficient",
    });
    pad += 1;
  }
  const sliced = tasks.slice(0, 12);
  const accelerate = sliced.filter((task) => task.classification === "accelerate").length / sliced.length;
  const skills = unique([
    ...occupation.recommendedSkills,
    ...occupation.AIApplicableTasks,
    ...occupation.humanCriticalTasks,
    "dokumentointi",
    "laadunvarmistus",
    "vuorovaikutus",
  ]).slice(0, 5);
  while (skills.length < 3) skills.push("tehtäväkuvauksen tarkentaminen");

  return {
    tasks: sliced,
    accelerateShareLow: clamp01(accelerate - 0.05),
    accelerateShareHigh: clamp01(accelerate + 0.05),
    automatableShareLow: clamp01(accelerate * 0.5),
    automatableShareHigh: clamp01(accelerate * 0.7 + 0.05),
    recommendedSkills: skills.slice(0, 5),
    distinguishesExposureFromDisplacement: true,
  };
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

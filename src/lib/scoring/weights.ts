/**
 * Single documented location for analysis scoring weights and gates.
 * Career-bridge ranking, coverage completeness, and situation thresholds
 * must import from this file. Do not duplicate the numbers elsewhere.
 */

export const BRIDGE_WEIGHTS = {
  transferableSkillOverlap: 0.28,
  taskOverlap: 0.18,
  qualificationDistance: 0.14,
  occupationalGroupProximity: 0.14,
  labourMarketOutlook: 0.1,
  aiExposureDifference: 0.08,
  dataCompleteness: 0.08,
} as const;

export type BridgeWeightKey = keyof typeof BRIDGE_WEIGHTS;

const weightSum =
  BRIDGE_WEIGHTS.transferableSkillOverlap +
  BRIDGE_WEIGHTS.taskOverlap +
  BRIDGE_WEIGHTS.qualificationDistance +
  BRIDGE_WEIGHTS.occupationalGroupProximity +
  BRIDGE_WEIGHTS.labourMarketOutlook +
  BRIDGE_WEIGHTS.aiExposureDifference +
  BRIDGE_WEIGHTS.dataCompleteness;

if (Math.abs(weightSum - 1) > 1e-9) {
  throw new Error(`BRIDGE_WEIGHTS must sum to 1, got ${weightSum}`);
}

export const BRIDGE_LIMIT = 5;
export const BRIDGE_HIGHLIGHT_LIMIT = 3;
export const BRIDGE_MIN_SCORE = 0.22;
export const BRIDGE_MIN_COMPLETENESS = 0.28;
export const BRIDGE_TIE_EPSILON = 0.03;
export const BRIDGE_TRANSFERABLE_SIGNAL = 0.35;

export const COVERAGE_FIELD_WEIGHTS = {
  officialEmployment: 0.16,
  officialOutlook: 0.16,
  officialDescription: 0.1,
  aiScores: 0.16,
  tasks: 0.16,
  skills: 0.14,
  qualifications: 0.06,
  humanCritical: 0.06,
} as const;

export const COVERAGE_SITUATION_MIN = 0.42;
export const COVERAGE_BRIDGES_MIN = 0.28;

export const SITUATION_ACCELERATE_SHARE_MIN = 0.4;
export const SITUATION_HIGH_EXPOSURE_MIN = 7;
export const NEXT_ACTION_LIMIT = 3;

export const ANALYSIS_SCORE_STALE_MS = 1000 * 60 * 60 * 24 * 548;

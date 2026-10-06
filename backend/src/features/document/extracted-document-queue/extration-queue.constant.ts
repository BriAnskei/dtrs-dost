export const DECISION_VALUES = ["ACCEPT", "REVIEW", "INVALID"] as const;
export type Decision = (typeof DECISION_VALUES)[number];

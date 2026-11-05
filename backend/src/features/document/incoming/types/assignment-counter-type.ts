export type AssignmentCountField = "total" | "ongoing" | "complete";

export type AssignmentCountChanges = Partial<Record<AssignmentCountField, number>>;

import type { ReceiverExtractedField } from "./types/reciever-upload-api-types";

/** Steps shown to the receiver while their upload is being processed. */
export const PROGRESS_STEPS = [
  "Reading document",
  "Extracting details",
  "Sending to review queue",
] as const;

export const FIELD_LABELS: Record<ReceiverExtractedField["field"], string> = {
  subject: "Subject",
  from: "From",
  to: "To",
  dateReceived: "Date received",
  summary: "Summary",
};

/** Percent thresholds (0-100): >= high is High, >= medium is Medium, otherwise Low. */
export const CONFIDENCE_THRESHOLDS = { high: 90, medium: 70 } as const;

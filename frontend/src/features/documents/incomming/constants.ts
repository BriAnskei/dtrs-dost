import type {
  IncomingDocumentDateField,
  IncomingDocumentSortOrder,
  IncomingDocumentStatus,
} from "./types/incoming-document.type";

export const DEFAULT_SORT: IncomingDocumentSortOrder = "newestUpload";
export const DEFAULT_DATE_FIELD: IncomingDocumentDateField = "uploadDate";

/** Empty string = "All statuses" (no status param sent). */
export type StatusFilter = IncomingDocumentStatus | "";
export const DEFAULT_STATUS: StatusFilter = "";

export const DATE_FIELD_OPTIONS: { value: IncomingDocumentDateField; label: string }[] = [
  { value: "uploadDate", label: "Upload date" },
  { value: "dateReceived", label: "Date received" },
];

export const SORT_OPTIONS: { value: IncomingDocumentSortOrder; label: string }[] = [
  { value: "newestUpload", label: "Newest upload" },
  { value: "oldestUpload", label: "Oldest upload" },
  { value: "latestReceived", label: "Latest received date" },
  { value: "subjectAsc", label: "Subject A–Z" },
];

export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "ongoing", label: "Ongoing" },
  { value: "complete", label: "Complete" },
];

export const STATUS_LABELS: Record<IncomingDocumentStatus, string> = {
  pending: "Pending",
  ongoing: "Ongoing",
  complete: "Complete",
};

export const STATUS_BADGE_CLASSES: Record<IncomingDocumentStatus, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  ongoing: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  complete: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

export function getDateFieldLabel(field: IncomingDocumentDateField): string {
  return DATE_FIELD_OPTIONS.find((o) => o.value === field)?.label ?? field;
}

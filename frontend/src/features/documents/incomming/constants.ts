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

export function getDateFieldLabel(field: IncomingDocumentDateField): string {
  return DATE_FIELD_OPTIONS.find((o) => o.value === field)?.label ?? field;
}

import type {
  OutgoingDocumentDateField,
  OutgoingDocumentSort,
} from "./types/outgoing-document.type";

export const DEFAULT_SORT: OutgoingDocumentSort = "newest";
export const DEFAULT_DATE_FIELD: OutgoingDocumentDateField = "uploadDate";

export const DATE_FIELD_OPTIONS: { value: OutgoingDocumentDateField; label: string }[] = [
  { value: "uploadDate", label: "Upload date" },
  { value: "datePrepared", label: "Date prepared" },
  { value: "dateReceived", label: "Date received" },
];

export const SORT_OPTIONS: { value: OutgoingDocumentSort; label: string }[] = [
  { value: "newest", label: "Newest upload" },
  { value: "oldest", label: "Oldest upload" },
  { value: "latest_prepared", label: "Latest prepared date" },
  { value: "subject_asc", label: "Subject A–Z" },
];

export function getDateFieldLabel(field: OutgoingDocumentDateField): string {
  return DATE_FIELD_OPTIONS.find((o) => o.value === field)?.label ?? field;
}

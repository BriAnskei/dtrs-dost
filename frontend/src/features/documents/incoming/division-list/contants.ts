import type { DivisionIncomingDocumentSortOrder } from "./types/division-incoming-document.type";

export const DEFAULT_DIVISION_SORT: DivisionIncomingDocumentSortOrder = "newestRouted";

export const DIVISION_SORT_OPTIONS: {
  value: DivisionIncomingDocumentSortOrder;
  label: string;
}[] = [
  { value: "newestRouted", label: "Newest routed" },
  { value: "oldestRouted", label: "Oldest routed" },
];

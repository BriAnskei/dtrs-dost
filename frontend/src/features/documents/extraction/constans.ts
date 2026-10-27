import type { DocumentDirection, FieldKey } from "./types/extraction-types";

export const ACCEPT_THRESHOLD = 90; // >= 90 ACCEPT, <= 89 REVIEW

export const FIELD_LABELS: Record<FieldKey, string> = {
  subject: "Subject",
  from: "From",
  to: "To",
  dateReceived: "Date Received",
  datePrepared: "Date Prepared",
  summary: "Summary",
};

export const FIELDS_BY_DIRECTION: Record<DocumentDirection, FieldKey[]> = {
  incoming: ["subject", "from", "to", "dateReceived", "summary"],
  outgoing: ["to", "subject", "datePrepared", "summary"],
};

export const DIRECTION_OPTIONS: {
  value: DocumentDirection;
  label: string;
  description: string;
}[] = [
  {
    value: "incoming",
    label: "Incoming Document",
    description: "Extracts subject, from, to, date received, summary",
  },
  {
    value: "outgoing",
    label: "Outgoing Document",
    description: "Extracts to, subject, date released and summary. No routing.",
  },
];

export const MAX_FILE_MB = 20;

export const WIZARD_STEPS = [
  {
    label: "Document Type",
    title: "What kind of document is this?",
    hint: "Pick one — it decides which fields are extracted.",
  },
  { label: "Upload", title: "Upload the PDF", hint: "Only PDF files are accepted." },
  {
    label: "Extraction",
    title: "Extracting data",
    hint: "Source extraction runs in your browser, then the server runs the LLM.",
  },
  {
    label: "Review",
    title: "Extraction result",
    hint: "Check the confidence and decision before continuing.",
  },
] as const;

/** Values the LLM writes itself (not copied from the page): highlight the whole source line. */
export const CHUNK_LEVEL_FIELDS = new Set<FieldKey>(["summary"]);

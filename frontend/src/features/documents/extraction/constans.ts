import type { DocumentDirection, FieldKey } from "./types/mock-types";

export const ACCEPT_THRESHOLD = 90; // >= 90 ACCEPT, <= 89 REVIEW

export const FIELD_LABELS: Record<FieldKey, string> = {
  subject: "Subject",
  from: "From",
  to: "To",
  dateReceived: "Date Received",
  dateReleased: "Date Released",
  summary: "Summary",
};

export const FIELDS_BY_DIRECTION: Record<DocumentDirection, FieldKey[]> = {
  incoming: ["subject", "from", "to", "dateReceived", "summary"],
  outgoing: ["to", "subject", "dateReleased"],
};

export const DIRECTION_OPTIONS: {
  value: DocumentDirection;
  label: string;
  description: string;
}[] = [
  {
    value: "incoming",
    label: "Incoming Document",
    description: "Extracts subject, from, to, date received, summary + division routing.",
  },
  {
    value: "outgoing",
    label: "Outgoing Document",
    description: "Extracts to, subject and date released only. No routing.",
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

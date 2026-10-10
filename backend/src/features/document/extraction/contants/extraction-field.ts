export const FIELD_KEYS = [
  "subject",
  "from",
  "to",
  "dateReceived",
  "datePrepared",
  "summary",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELDS_BY_DIRECTION = {
  incoming: ["subject", "from", "to", "dateReceived", "summary"],

  outgoing: ["to", "subject", "datePrepared", "summary"],
} as const satisfies Record<"incoming" | "outgoing", readonly FieldKey[]>;

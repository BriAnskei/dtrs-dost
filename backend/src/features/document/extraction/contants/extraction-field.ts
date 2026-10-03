
export const FIELD_KEYS = [
  "subject",
  "from",
  "to",
  "dateReceived",
  "dateReleased",
  "summary",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELDS_BY_DIRECTION = {
  incoming: ["subject", "from", "to", "dateReceived", "summary"],

  outgoing: ["to", "subject", "dateReleased"],
} as const satisfies Record<"incoming" | "outgoing", readonly FieldKey[]>;
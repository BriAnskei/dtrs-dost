export const DOCUMENT_DIRECTIONS = ["incoming", "outgoing"] as const;

export type DocumentDirection = (typeof DOCUMENT_DIRECTIONS)[number];

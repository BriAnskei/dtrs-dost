export type DocumentDirection = "incoming" | "outgoing";
export type ExtractionPhase = "idle" | "source" | "llm" | "done" | "failed";

export type FieldKey =
  | "subject"
  | "from"
  | "to"
  | "dateReceived"
  | "datePrepared"
  | "summary";
export type Decision = "ACCEPT" | "REVIEW" | "INVALID";
export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
}

/** One row of the result table. null = field not found by the LLM. */
export interface ResultRow {
  field: FieldKey;
  value: string | null;
  page: number | null;
  chunkIds: string[];
  highlights: FieldHighlight[];
  aiConfidence: number | null;
  sourceConfidence: number | null;
  effectiveConfidence: number | null;
}

/** Normalized 0-1 of the page, origin top-left (zoom/DPI independent). */
export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ChunkToken {
  text: string;
  bbox: BBox;
  confidence: number;
}

/** Where a source chunk lives in the PDF. Looked up by chunkId (never sent to the LLM). */
export interface ChunkLocation {
  page: number; // 1-based
  bbox: BBox;
  text: string;
  /** 0-100 source confidence from PDF extraction (absent for legacy chunks). */
  sourceConfidence?: number;
  tokens?: ChunkToken[];
}

export interface ExtractionOutcome {
  /** chunkId -> location. Built from client-side source extraction (normalized 0-1, top-left). */
  chunkLocations: Record<string, ChunkLocation>;
  rows: ResultRow[];
  decision: Decision;
  minEffective: number | null;
}

export interface FieldHighlight {
  page: number;
  bbox: BBox;
}

/** Returned by useExtraction().start() when something unexpected broke. */
export interface ExtractionFailure {
  ok: false;
  title: string;
  description?: string;
  /** true = something else already told the user (e.g. the Axios interceptor toast) */
  silent: boolean;
}

export type ExtractionResult = { ok: true } | ExtractionFailure;

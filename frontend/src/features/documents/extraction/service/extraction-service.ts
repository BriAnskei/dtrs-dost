import { apiClient } from "../../../../lib/api-client";
import type { DocumentDirection, FieldKey } from "../types/mock-types";

/**
 * Request payload sent to the backend LLM for field extraction (Pattern A —
 * chunkId reference). The client runs source extraction itself (pdf.js text +
 * optional OCR) and ships the extracted *text chunks* only — never raw PDF
 * bytes and never coordinates. The LLM returns, per field, the chunkId its
 * value was found in; the client joins that chunkId to its already-known
 * chunkId -> bbox map to render the highlight.
 */
export interface ExtractionRequest {
  /** Document flow type; selects which fields the LLM should look for. */
  documentType: DocumentDirection;
  /**
   * Text chunks with their stable ids. `bbox` is intentionally omitted — the
   * server must not need geometry (it can't see the page). The chunkId the
   * LLM echoes back is the only positional token that crosses the wire.
   */
  chunks: Array<{ chunkId: string; text: string }>;
}

/** One field extracted by the backend LLM, located via chunkId. */
export interface FieldExtraction {
  field: FieldKey;
  /** Extracted value, or null when the LLM found nothing. */
  value: string | null;
  /**
   * chunkId whose chunk text contained this value (so the client can highlight
   * it). null when the value was synthesized / not found in any chunk.
   */
  chunkId: string | null;
  /** LLM self-confidence 0-100, or null when the model gives none. */
  aiConfidence: number | null;
}

export interface ExtractionResponse {
  fields: FieldExtraction[];
}

/**
 * Server-side LLM extraction (Pattern A — chunkId reference).
 *
 * ── BACKEND BLUEPRINT ─────────────────────────────────────────────────
 * Endpoint:  POST /api/extraction   (mount under the existing apiClient base)
 * Controller: backend/src/controllers/ai-extractor.controller.ts
 * Auth:      bearer session cookie (apiClient is configured withCredentials)
 *
 * Request body  (ExtractionRequest):
 *   {
 *     "documentType": "incoming" | "outgoing",
 *     "chunks": [
 *       { "chunkId": "p1-t1", "text": "Subject: Q4 Barangay Road Inspection" },
 *       { "chunkId": "p1-t2", "text": "From: Hon. Juan Dela Cruz, Municipal Mayor" },
 *       ...
 *     ]
 *   }
 *
 * The server MUST:
 *   1. Validate `chunks` is a non-empty array of {chunkId:string, text:string}.
 *   2. Build an LLM prompt that, given ONLY the chunk texts (no coordinates),
 *      extracts the fields for the document type AND, for every value it finds,
 *      returns the chunkId of the chunk whose `text` contains that value.
 *      Tell the model to echo the *exact* chunkId string verbatim.
 *   3. The field set per documentType (keep in sync with FIELDS_BY_DIRECTION):
 *        incoming : subject, from, to, dateReceived, summary
 *        outgoing : to, subject, dateReleased
 *   4. Return 200 with this JSON schema (validate before responding):
 *      {
 *        "fields": [
 *          {
 *            "field": "subject" | "from" | "to" | "dateReceived" |
 *                     "dateReleased" | "summary",
 *            "value": string | null,   // null when not found
 *            "chunkId": string | null, // verbatim chunkId the value came from
 *            "aiConfidence": number | null // 0-100
 *          }
 *        ]
 *      }
 *      Include an entry for EVERY field in the field set — emit null when absent
 *      so the client can mark the field INVALID for review routing.
 *   5. On error, respond 4xx with { "success": false, "error": "<reason>" }.
 *
 * The server does NOT return bbox/coordinates: every chunkId -> bbox the client
 * already holds (built from its own source extraction). chunkId is the only
 * positional token the wire contract carries.
 * ───────────────────────────────────────────────────────────────────────
 */
export async function extractFields(
  request: ExtractionRequest,
): Promise<ExtractionResponse> {
  const response = await apiClient.post<ExtractionResponse>("/api/extraction", request);
  return response.data;
}

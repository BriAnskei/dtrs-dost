import { apiClient } from "../../../../lib/api-client";
import type { DocumentDirection, FieldKey } from "../types/extraction-types";

export interface ExtractionRequest {
  /** Document flow type; selects which fields the LLM should look for. */
  documentType: DocumentDirection;

  chunks: Array<{ chunkId: string; text: string }>;
}

export interface FieldExtraction {
  field: FieldKey;
  value: string | null;
  chunkIds: string[];
  aiConfidence: number | null;
}

export interface ExtractionResponse {
  fields: FieldExtraction[];
}
/**
 * POST /extraction
 *
 * ── REQUEST ─────────────────────────────────────────────────────────────────
 * Text only. Never send coordinates, tokens, OCR confidence or the source
 * (text/ocr). The server never needs to know where text sits on the page.
 *
 *   {
 *     "documentType": "incoming",
 *     "chunks": [
 *       { "chunkId": "p1-t1", "text": "Republic of the Philippines" },
 *       { "chunkId": "p2-o3", "text": "Subject: Request for Project Inspection" }
 *     ]
 *   }
 *
 * chunkId  "p<page>-t<n>" is native text, "p<page>-o<n>" is OCR. Each chunk is
 *          one LINE, listed in reading order (top to bottom).
 *
 * ── RESPONSE ────────────────────────────────────────────────────────────────
 *   {
 *     "fields": [
 *       {
 *         "field": "subject",
 *         "value": "Request for Project Inspection",
 *         "chunkIds": ["p2-o3"],
 *         "aiConfidence": 94
 *       },
 *       { "field": "to", "value": null, "chunkIds": [], "aiConfidence": null }
 *     ]
 *   }
 *
 * RULES (the client's highlighting depends on these)
 *  1. Return exactly one entry per field requested for `documentType`
 *     (incoming: subject, from, to, dateReceived, summary; outgoing: to,
 *     subject, dateReleased, summary). Missing/duplicate entries are treated as "not
 *     found".
 *  2. `value` must be copied VERBATIM from the chunk text: same words, same
 *     spelling, same date format as printed. Do not rephrase, expand
 *     abbreviations, drop punctuation words, or reformat dates (so "October 3,
 *     2026" stays "October 3, 2026", not "2026-10-03"). The client finds the
 *     value's words inside the cited chunk to draw a tight highlight; if
 *     nothing matches it falls back to highlighting the whole line.
 *     Exception: `summary` is LLM-written; it is shown on the whole source
 *     line(s), so just cite the chunks it was based on.
 *  3. `chunkIds` lists EVERY chunk the value came from, in reading order. A
 *     subject that wraps over two lines returns both ids. Only ids that were in
 *     the request are allowed; unknown ids are dropped by the client (the server
 *     should strip them too). A non-null value needs at least one chunkId.
 *  4. Not found: `value: null`, `chunkIds: []`, `aiConfidence: null`. Any
 *     required field that is null makes the whole document INVALID.
 *  5. `aiConfidence` is the model's own certainty that `value` is the correct
 *     answer for the field, an integer from 0 to 100. It is NOT OCR quality. The
 *     client multiplies it by the source confidence of the cited chunk(s)
 *     (weakest one wins): effective = aiConfidence × sourceConfidence / 100.
 *  6. Division routing (incoming only) is a separate step, not part of this
 *     response.
 */
export const extractionService = {
  async extractFields(request: ExtractionRequest): Promise<ExtractionResponse> {
    const response = await apiClient.post<ExtractionResponse>("/extraction", request);
    return response.data;
  },
};

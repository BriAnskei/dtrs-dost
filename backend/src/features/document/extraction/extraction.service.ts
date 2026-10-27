import { Inject, Injectable, Logger } from "@nestjs/common";
import { DocumentDirection } from "./contants/document-direction";
import { FIELDS_BY_DIRECTION, FieldKey } from "./contants/extraction-field";
import { ExtractionRequestDto } from "./dto/extraction-request-dto";
import { ExtractionResponseDto } from "./dto/extraction-response-dto";
import { valueInDocument } from "./extraction-text-match";
import type { LlmExtractor } from "./providers/llm-extractor.interface";
import { ExtractedField, LLM_EXTRACTOR } from "./providers/llm-extractor.interface";

@Injectable()
export class ExtractionService {
  private readonly logger = new Logger(ExtractionService.name);

  constructor(
    @Inject(LLM_EXTRACTOR)
    private readonly llmExtractor: LlmExtractor,
  ) {}

  async extract(request: ExtractionRequestDto): Promise<ExtractionResponseDto> {
    /*
     * Deduplicate request chunks by chunkId (keep first occurrence) so a
     * valid "one source line, many fields" document never hard-fails just
     * because a client emitted the same chunkId twice. The deduped list is
     * what reaches the LLM and what the field validation keys off, keeping
     * chunkId membership consistent across both.
     */
    const chunks = this.validateChunks(request.chunks);

    this.logger.debug(
      `Extraction request: documentType=${request.documentType}, chunks=${request.chunks.length}`,
    );

    const extractedFields = await this.llmExtractor.extractFields(
      request.documentType,
      chunks,
    );

    this.logger.debug(`Extracted ${extractedFields.length} raw field(s) from LLM.`);

    const fields = this.validateAndNormalizeFields(
      request.documentType,
      chunks,
      extractedFields,
    );

    const untrustedCount = fields.filter((f) => f.aiConfidence === null && f.value !== null).length;
    if (untrustedCount > 0) {
      this.logger.warn(
        `${untrustedCount} field(s) have null aiConfidence with a non-null value ` +
          `(anti-hallucination or LLM-omitted confidence). The decision will be ` +
          `INVALID so a human can review.`,
      );
    }

    return {
      fields,
    };
  }

  /**
   * Deduplicate chunks by chunkId, keeping the first occurrence's text.
   *
   * A duplicate chunkId in the request is recoverable (the chunk text is
   * expected to be identical under the chunkId contract): rather than throw a
   * 400 — which would reject a legitimate multi-field-from-one-line document
   * whenever a client repeats a chunkId — we drop the duplicates and continue,
   * logging a single warning. Duplicate FIELD keys are still normalized by
   * `validateAndNormalizeFields` (keeps first, warns); only request-side
   * chunkId duplicates are deduped here.
   *
   * Note: the `ExtractedDocumentQueueUseCase` also dedupes before calling this
   * service, so the deduplication here is a defensive second pass — both layers
   * keep the first occurrence, ensuring consistency.
   */
  private validateChunks(
    chunks: ExtractionRequestDto["chunks"],
  ): ExtractionRequestDto["chunks"] {
    const seen = new Set<string>();

    const deduped: ExtractionRequestDto["chunks"] = [];

    let dropped = 0;

    for (const chunk of chunks) {
      if (seen.has(chunk.chunkId)) {
        dropped++;

        continue;
      }

      seen.add(chunk.chunkId);

      deduped.push(chunk);
    }

    if (dropped > 0) {
      this.logger.warn(
        `Dropped ${dropped} duplicate chunkId(s) from extraction request; ` +
          `kept first occurrence per chunkId.`,
      );
    }

    return deduped;
  }

  private validateAndNormalizeFields(
    documentType: DocumentDirection,
    chunks: ExtractionRequestDto["chunks"],
    fields: ExtractedField[],
  ): ExtractedField[] {
    const expectedFields = FIELDS_BY_DIRECTION[documentType];

    const fieldsByName = new Map<FieldKey, ExtractedField>();

    for (const field of fields) {
      if (fieldsByName.has(field.field)) {
        /* Duplicate field key from the LLM — keep the first occurrence, warn. */
        this.logger.warn(
          `Duplicate field "${field.field}" returned by LLM; keeping first occurrence.`,
        );

        continue;
      }

      fieldsByName.set(field.field, field);
    }

    const chunksById = new Map(chunks.map((chunk) => [chunk.chunkId, chunk.text]));

    /*
     * Union of every chunk's text. A field value can legitimately span several
     * line-level chunks (e.g. a multi-line title split across OCR lines) while
     * the LLM cites only the first chunk it saw. Validating the value against the
     * whole document text — rather than a single chunk — prevents a hard 400 for a
     * value that is genuinely present but not fully contained in the cited chunk.
     * The per-cite check is downgraded to a warning below.
     */
    const documentText = chunks.map((chunk) => chunk.text).join("\n");

    return expectedFields.map((fieldName) => {
      const field = fieldsByName.get(fieldName);

      /*
       * Gemini didn't return the field.
       *
       * Instead of trusting the model to always return
       * everything, the server guarantees the API contract.
       */
      if (!field) {
        return {
          field: fieldName,
          value: null,
          chunkIds: [],
          aiConfidence: null,
        };
      }

      /*
       * `validateField` returns `false` when the LLM's value could not be
       * verified against the document text (anti-hallucination), or when
       * structural LLM mistakes were normalized (out-of-range confidence,
       * unknown chunkIds, null value with chunkIds). In all those cases we
       * null out `aiConfidence`, which the decision logic in
       * `resolveExtraction` treats as INVALID, routing the document for
       * human review. The untrusted value and chunkIds are still returned
       * so the reviewer can see what the LLM produced.
       */
      const trusted = this.validateField(field, chunksById, documentText);

      return {
        field: fieldName,
        value: field.value,
        chunkIds: field.chunkIds,
        aiConfidence: trusted ? field.aiConfidence : null,
      };
    });
  }

  /**
   * Validate a single extracted field against the document text.
   *
   * Returns `true` when the field is trusted (its value was confirmed against
   * the document text), `false` when the value could not be verified
   * (anti-hallucination failure).
   *
   * LLM output that is structurally inconsistent — out-of-range confidence,
   * null value with chunkIds, unknown chunkId — is normalized rather than
   * thrown as a 400, since these are model faults, not client faults. The
   * caller nulls out `aiConfidence` for untrusted fields, which routes the
   * document to INVALID via the decision logic.
   */
  private validateField(
    field: ExtractedField,
    chunksById: Map<string, string>,
    documentText: string,
  ): boolean {
    /* Confidence must be 0-100; null it if the LLM gave garbage. */
    if (
      field.aiConfidence !== null &&
      (field.aiConfidence < 0 || field.aiConfidence > 100)
    ) {
      this.logger.warn(
        `Field "${field.field}" aiConfidence ${field.aiConfidence} outside [0, 100]; nulling.`,
      );

      field.aiConfidence = null;

      return false;
    }

    /* No value means there should be no cited chunks — clear them. */
    if (field.value === null) {
      if (field.chunkIds.length > 0) {
        this.logger.warn(
          `Field "${field.field}" has chunkIds but value is null; clearing chunkIds.`,
        );

        field.chunkIds = [];
      }

      return true;
    }

    /* Drop any cited chunkId the client never sent. */
    const unknownChunkIds = field.chunkIds.filter((id) => !chunksById.has(id));

    if (unknownChunkIds.length > 0) {
      this.logger.warn(
        `Field "${field.field}" cited unknown chunkId(s) ${unknownChunkIds.join(", ")}; dropping them.`,
      );

      field.chunkIds = field.chunkIds.filter((id) => chunksById.has(id));
    }

    /*
     * `summary` is LLM-written prose, not copied verbatim from any chunk.
     * The anti-hallucination and citation-precision checks below assume the
     * value is a verbatim substring of chunk text, so they are skipped for
     * summary. The client highlights the whole cited chunk(s) regardless.
     */
    if (field.field === "summary") {
      /* A non-null value should still cite at least one chunk for highlighting. */
      if (field.chunkIds.length === 0) {
        this.logger.warn(`Field "summary" has a value but cites no chunkIds.`);
      }

      return true;
    }

    /*
     * Verify the value is present in the document at all (anti-hallucination).
     * Checking the whole document text — not just the cited chunks — tolerates
     * multi-line values that the LLM attributes to a subset of chunks.
     *
     * If the LLM returned a value that cannot be found in the document at all,
     * we cannot trust it. Rather than throwing a 400 (which discards every
     * other field that was extracted correctly), we return `false` so the
     * caller can null out `aiConfidence` for this field. The decision logic
     * treats a null `aiConfidence` as INVALID, routing the document to human
     * review. The untrusted value is still returned to the client so the
     * reviewer can see what the LLM hallucinated and compare it against the
     * actual document text.
     */
    if (!valueInDocument(field.value, documentText)) {
      this.logger.warn(
        `Field "${field.field}" value "${field.value}" not found in document text (possible LLM hallucination). aiConfidence will be set to null; decision INVALID.`,
      );

      return false;
    }

    /*
     * A non-null value should cite at least one chunk. The value was verified
     * against the document text, so it is trusted — but with no cited chunks the
     * field has no source confidence, so effectiveConfidence will be null and the
     * document will be INVALID via the decision logic. Warn so the reviewer
     * knows why an otherwise-verified field was flagged.
     */
    if (field.chunkIds.length === 0) {
      this.logger.warn(`Field "${field.field}" value was found but cites no chunkIds.`);

      return true;
    }

    /*
     * Verify the value is supported by the cited chunks — the union of every
     * cited chunk's text must contain the value. A value spanning several chunks
     * (e.g. a subject split across two OCR lines) is valid as long as the cited
     * chunks collectively contain it. If the value is in the document but not in
     * the cited chunks, the citation is imprecise — warn, not throw.
     */
    const citedText = field.chunkIds.map((id) => chunksById.get(id) ?? "").join("\n");

    if (!valueInDocument(field.value, citedText)) {
      this.logger.warn(
        `Field "${field.field}" value was found in the document but not in ` +
          `the cited chunk(s); highlight may be imprecise.`,
      );
    }

    return true;
  }
}

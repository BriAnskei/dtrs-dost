import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
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
   * logging a single warning. Duplicate FIELD keys are still rejected by
   * `validateAndNormalizeFields`; only request-side chunkId duplicates are
   * tolerated here.
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
        this.logger.error(
          `Validation failed: duplicate field "${field.field}" returned by LLM.`,
        );

        throw new BadRequestException({
          success: false,
          error: `Duplicate extracted field: ${field.field}`,
        });
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

      this.validateField(field, chunksById, documentText);

      return {
        field: fieldName,
        value: field.value,
        chunkIds: field.chunkIds,
        aiConfidence: field.aiConfidence,
      };
    });
  }

  private validateField(
    field: ExtractedField,
    chunksById: Map<string, string>,
    documentText: string,
  ): void {
    /* Confidence must be 0-100. */
    if (
      field.aiConfidence !== null &&
      (field.aiConfidence < 0 || field.aiConfidence > 100)
    ) {
      this.logger.error(
        `Validation failed: field "${field.field}" aiConfidence ${field.aiConfidence} outside [0, 100].`,
      );

      throw new BadRequestException({
        success: false,
        error: `Invalid confidence for field ${field.field}`,
      });
    }

    /* No value means there should be no cited chunks. */
    if (field.value === null) {
      if (field.chunkIds.length > 0) {
        this.logger.error(
          `Validation failed: field "${field.field}" has chunkIds ${JSON.stringify(field.chunkIds)} but value is null.`,
        );

        throw new BadRequestException({
          success: false,
          error: `Field ${field.field} has chunkIds but no value`,
        });
      }

      return;
    }

    /* Every cited chunkId must have been sent by the client. */
    for (const chunkId of field.chunkIds) {
      if (!chunksById.has(chunkId)) {
        this.logger.error(
          `Validation failed: field "${field.field}" cited chunkId "${chunkId}" not present in the request chunks.`,
        );

        throw new BadRequestException({
          success: false,
          error: `Invalid chunkId "${chunkId}" returned for field "${field.field}"`,
        });
      }
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

      return;
    }

    /*
     * Verify the value is present in the document at all (anti-hallucination).
     * Checking the whole document text — not just the cited chunks — tolerates
     * multi-line values that the LLM attributes to a subset of chunks.
     */
    if (!valueInDocument(field.value, documentText)) {
      this.logger.error(
        `Validation failed: field "${field.field}" value "${field.value}" not found in document text (possible LLM hallucination).`,
      );

      throw new BadRequestException({
        success: false,
        error:
          `Extracted value for "${field.field}" ` + `was not found in any document chunk`,
      });
    }

    /*
     * A non-null value should cite at least one chunk. A value without a citation
     * is not a safety problem, only a UX one (no highlight), so warn.
     */
    if (field.chunkIds.length === 0) {
      this.logger.warn(`Field "${field.field}" value was found but cites no chunkIds.`);

      return;
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
  }
}

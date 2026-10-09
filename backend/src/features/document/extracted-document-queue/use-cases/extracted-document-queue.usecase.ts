import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { buildDocumentKey } from "../../../../storage/s3/buildDocumentKey";
import { S3Service } from "../../../../storage/s3/s3.service";
import { DocumentFileService } from "../../document-file/document-file.service";
import { ExtractionService } from "../../extraction/extraction.service";
import { ExtractedField } from "../../extraction/providers/llm-extractor.interface";
import { CreateExtractedDocumentDto } from "../dto/create-extracted-document-dto";
import type { Decision } from "../extration-queue.constant";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";
import {
  ExtractedChunk,
  ExtractedDocumentField,
  ReceiveDocumentResponse,
} from "../types/extracted-types";

/**
 * Minimum per-field `aiConfidence` (0-100 scale) required for an accepted
 * auto-extracted document. Documents whose best field falls below this are
 * routed to human review; any missing field is flagged INVALID.
 */
const ACCEPT_CONFIDENCE_THRESHOLD = 90;

@Injectable()
export class ExtractedDocumentQueueUseCase {
  private readonly logger = new Logger(ExtractedDocumentQueueUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly extractionService: ExtractionService,
    private readonly documentFileService: DocumentFileService,
    private readonly extractedDocumentQueueService: ExtractedDocumentQueueService,
    private readonly s3Service: S3Service,
  ) {}

  private resolveExtraction(
    fields: ExtractedField[],
    chunks: ExtractedChunk[],
  ): ReceiveDocumentResponse {
    const chunkSourceConfidence = new Map(
      chunks.map((chunk) => [chunk.chunkId, chunk.sourceConfidence]),
    );

    const resolvedFields: ExtractedDocumentField[] = fields.map((field) => {
      if (field.value === null || field.aiConfidence === null) {
        return {
          field: field.field,
          value: field.value,
          chunkIds: field.chunkIds,
          aiConfidence: field.aiConfidence,
          sourceConfidence: null,
          effectiveConfidence: null,
        };
      }

      const sourceConfidences = field.chunkIds
        .map((chunkId) => chunkSourceConfidence.get(chunkId))
        .filter((confidence): confidence is number => confidence != null);

      if (sourceConfidences.length === 0) {
        return {
          field: field.field,
          value: field.value,
          chunkIds: field.chunkIds,
          aiConfidence: field.aiConfidence,
          sourceConfidence: null,
          effectiveConfidence: null,
        };
      }

      const sourceConfidence = Math.min(...sourceConfidences);

      const effectiveConfidence = Math.round(
        (field.aiConfidence * sourceConfidence) / 100,
      );

      return {
        field: field.field,
        value: field.value,
        chunkIds: field.chunkIds,
        aiConfidence: field.aiConfidence,
        sourceConfidence,
        effectiveConfidence,
      };
    });

    if (
      resolvedFields.some(
        (field) =>
          field.value === null ||
          field.aiConfidence === null ||
          field.effectiveConfidence === null,
      )
    ) {
      return {
        decision: "INVALID",
        fields: resolvedFields,
      };
    }

    const minEffectiveConfidence = Math.min(
      ...resolvedFields.map((field) => field.effectiveConfidence ?? 0),
    );

    return {
      decision:
        minEffectiveConfidence >= ACCEPT_CONFIDENCE_THRESHOLD ? "ACCEPT" : "REVIEW",
      fields: resolvedFields,
    };
  }

  private async saveDocumentFile(file: Express.Multer.File) {
    const key = buildDocumentKey("incoming");

    await this.s3Service.upload(key, file.buffer, file.mimetype);

    return key;
  }

  async receiveDocument(
    file: Express.Multer.File,
    dto: CreateExtractedDocumentDto,
    user_id: string,
  ): Promise<ReceiveDocumentResponse> {
    const extracted = await this.extractionService.extract({
      documentType: "incoming",
      chunks: dto.chunks,
    });

    const objectKey = await this.saveDocumentFile(file);

    try {
      return await this.dataSource.transaction(async (manager) => {
        const documentFile = await this.documentFileService.create(
          {
            file_name: file.originalname,
            object_key: objectKey,
            uploader_id: user_id,
          },
          manager,
        );

        await this.extractedDocumentQueueService.create(
          {
            document_file_id: documentFile.id,
            extracted_data: extracted.fields,
            decision: this.resolveDecision(extracted.fields, dto.chunks),
            extracted_chunks: dto.chunks,
          },
          manager,
        );

        return this.resolveExtraction(extracted.fields, dto.chunks);
      });
    } catch (error) {
      await this.cleanupUploadedFile(objectKey, error);
      throw error;
    }
  }

  private resolveDecision(fields: ExtractedField[], chunks: ExtractedChunk[]): Decision {
    if (fields.some((field) => field.value === null)) {
      return "INVALID";
    }

    const chunkSourceConfidence = new Map(
      chunks.map((chunk) => [chunk.chunkId, chunk.sourceConfidence]),
    );

    const effectiveConfidences = fields.map((field) => {
      if (field.aiConfidence === null) {
        return null;
      }

      const sourceConfidences = field.chunkIds
        .map((chunkId) => chunkSourceConfidence.get(chunkId))
        .filter((confidence): confidence is number => confidence != null);

      if (sourceConfidences.length === 0) {
        return null;
      }

      const sourceConfidence = Math.min(...sourceConfidences);

      return Math.round((field.aiConfidence * sourceConfidence) / 100);
    });

    if (effectiveConfidences.some((confidence) => confidence === null)) {
      return "INVALID";
    }

    const minEffective = Math.min(
      ...effectiveConfidences.filter(
        (confidence): confidence is number => confidence !== null,
      ),
    );

    return minEffective >= ACCEPT_CONFIDENCE_THRESHOLD ? "ACCEPT" : "REVIEW";
  }

  private generateObjectKey(): string {
    return `documents/${uuidv4()}`;
  }

  private async cleanupUploadedFile(objectKey: string, error: unknown): Promise<void> {
    this.logger.error(
      `Database transaction failed for ${objectKey}. Cleaning up S3 object.`,
      error instanceof Error ? error.stack : String(error),
    );

    try {
      await this.s3Service.delete(objectKey);
    } catch (cleanupError) {
      this.logger.error(
        `Failed to clean up S3 object ${objectKey}.`,
        cleanupError instanceof Error ? cleanupError.stack : String(cleanupError),
      );
    }
  }
}

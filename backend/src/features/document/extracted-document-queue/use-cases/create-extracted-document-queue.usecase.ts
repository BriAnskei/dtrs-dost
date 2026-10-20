import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { buildDocumentKey } from "../../../../storage/s3/buildDocumentKey";
import { S3Service } from "../../../../storage/s3/s3.service";
import { DocumentFileService } from "../../document-file/service/document-file.service";
import { ExtractionService } from "../../extraction/extraction.service";
import { resolveExtraction } from "../domain/resolve-extraction";
import { CreateExtractedDocumentDto } from "../dto/create-extracted-document-dto";
import { ExtractedDocumentQueueStatus } from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueService } from "../service/extracted-document-queue.service";
import { ExtractedChunk, ReceiveDocumentResponse } from "../types/extracted-types";

@Injectable()
export class CreateExtractedDocumentQueueUseCase {
  private readonly logger = new Logger(CreateExtractedDocumentQueueUseCase.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly extractionService: ExtractionService,
    private readonly documentFileService: DocumentFileService,
    private readonly extractedDocumentQueueService: ExtractedDocumentQueueService,
    private readonly s3Service: S3Service,
  ) {}

  private async saveDocumentFile(file: Express.Multer.File) {
    const key = buildDocumentKey("incoming");

    await this.s3Service.upload(key, file.buffer, file.mimetype);

    return key;
  }

  async execute(
    file: Express.Multer.File,
    dto: CreateExtractedDocumentDto,
    user_id: string,
  ): Promise<ReceiveDocumentResponse> {
    /*
     * Dedupe chunks once up front (keep first occurrence per chunkId) so the
     * same array reaches the LLM, the resolution logic, and the stored entity.
     * The ExtractionService also dedupes internally, but the use-case needs the
     * deduped list for resolveExtraction and for storing in extracted_chunks.
     *
     * NOTE: The server does NOT re-extract text from the PDF — it trusts the
     * client-supplied chunk text and sourceConfidence. This is acceptable while
     * ACCEPT is only a hint and final approval is human-reviewed (status PENDING).
     * If auto-approval on ACCEPT is ever added, re-extract the PDF text server-side.
     */
    const chunks = this.dedupeChunks(dto.chunks);

    const extracted = await this.extractionService.extract({
      documentType: "incoming",
      chunks: chunks.map(({ page, bbox, ...textOnly }) => textOnly),
    });

    const resolved = resolveExtraction(extracted.fields, chunks);

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
            decision: resolved.decision,
            status: ExtractedDocumentQueueStatus.PENDING,
            extracted_chunks: chunks,
          },
          manager,
        );

        return resolved;
      });
    } catch (error) {
      await this.cleanupUploadedFile(objectKey, error);
      throw error;
    }
  }

  /** Dedupe chunks by chunkId, keeping the first occurrence's data. */
  private dedupeChunks(chunks: ExtractedChunk[]): ExtractedChunk[] {
    const seen = new Set<string>();

    const deduped: ExtractedChunk[] = [];

    for (const chunk of chunks) {
      if (seen.has(chunk.chunkId)) {
        continue;
      }

      seen.add(chunk.chunkId);
      deduped.push(chunk);
    }

    return deduped;
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

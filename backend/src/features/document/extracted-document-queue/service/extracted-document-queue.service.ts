import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { PaginatedResponse } from "../../../../common/pagination/paginated-response";
import { resolveExtraction } from "../domain/resolve-extraction";
import { ExtractedDocumentQueueResponseDto } from "../dto/extracted-document-response-dto";
import { FindExtractedDocumentQueuesQueryDto } from "../dto/find-extracted-document-queues-query.dto";
import { FindMyExtractedDocumentQueuesQueryDto } from "../dto/find-my-extracted-document-queues-query.dto";
import { MyExtractedDocumentQueueResponseDto } from "../dto/my-extracted-document-queue-response-dto";
import {
  ExtractedDocumentQueueEntity,
  ExtractedDocumentQueueStatus,
} from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueRepository } from "../repository/extracted-document-queue.repository";
import { ChunkBBox, ExtractedToken } from "../types/extracted-types";

@Injectable()
export class ExtractedDocumentQueueService {
  constructor(private readonly repository: ExtractedDocumentQueueRepository) {}

  private toDto(queue: ExtractedDocumentQueueEntity): ExtractedDocumentQueueResponseDto {
    const dto = new ExtractedDocumentQueueResponseDto();

    dto.id = queue.id;
    dto.document_file_id = queue.document_file_id;
    dto.file_name = queue.document_file.file_name;
    dto.object_key = queue.document_file.object_key;
    dto.uploader_id = queue.document_file.uploader_id;
    dto.uploader_name = queue.document_file.uploader?.full_name ?? null;
    dto.decision = queue.decision;
    dto.created_at = queue.created_at;

    return dto;
  }

  private toMyDto(
    queue: ExtractedDocumentQueueEntity,
  ): MyExtractedDocumentQueueResponseDto {
    const dto = new MyExtractedDocumentQueueResponseDto();

    dto.id = queue.id;
    dto.file_name = queue.document_file.file_name;
    dto.decision = queue.decision;
    dto.status = queue.status;
    dto.created_at = queue.created_at;

    dto.fields = resolveExtraction(queue.extracted_data, queue.extracted_chunks).fields;

    return dto;
  }

  async create(
    data: Partial<ExtractedDocumentQueueEntity>,
    manager: EntityManager,
  ): Promise<ExtractedDocumentQueueEntity> {
    return this.repository.create(data, manager);
  }

  async findAll(
    query: FindExtractedDocumentQueuesQueryDto,
  ): Promise<PaginatedResponse<ExtractedDocumentQueueResponseDto>> {
    const result = await this.repository.findAll(query);

    return {
      data: result.data.map((queue) => this.toDto(queue)),
      nextCursor: result.nextCursor,
    };
  }

  async findAllByUploaderId(
    uploaderId: string,
    query: FindMyExtractedDocumentQueuesQueryDto,
  ) {
    const result = await this.repository.findAllByUploaderId(uploaderId, query);

    return {
      ...result,
      data: result.data.map(this.toMyDto),
    };
  }

  async findOneForReview(id: string) {
    const queue = await this.getOrThrow(id);
    const resolved = resolveExtraction(queue.extracted_data, queue.extracted_chunks);

    const chunk_locations: Record<
      string,
      {
        page: number;
        bbox: ChunkBBox;
        text: string;
        sourceConfidence: number;
        tokens?: ExtractedToken[];
      }
    > = {};
    for (const chunk of queue.extracted_chunks) {
      if (chunk.page && chunk.bbox) {
        chunk_locations[chunk.chunkId] = {
          page: chunk.page,
          bbox: chunk.bbox,
          text: chunk.text,
          sourceConfidence: chunk.sourceConfidence,
          tokens: chunk.tokens,
        };
      }
    }

    return {
      id: queue.id,
      file_name: queue.document_file.file_name,
      uploader_name: queue.document_file.uploader?.full_name ?? null,
      decision: queue.decision,
      status: queue.status,
      created_at: queue.created_at,
      fields: resolved.fields,
      chunk_locations,
    };
  }

  async getOrThrow(id: string) {
    const queue = await this.repository.findOneByIdWithJoin(id);
    if (!queue) throw new NotFoundException("Document Queue not found");
    return queue;
  }

  async findOne(id: string): Promise<ExtractedDocumentQueueEntity> {
    const queue = await this.repository.findOneById(id);

    if (!queue) throw new NotFoundException("Queue record not found");

    return queue;
  }

  async approveIfPending(
    id: string,
    manager: EntityManager,
  ): Promise<ExtractedDocumentQueueEntity> {
    const queue = await this.repository.findOneForUpdate(id, manager);

    if (!queue) throw new NotFoundException("Queue record not found");

    if (queue.status !== ExtractedDocumentQueueStatus.PENDING)
      throw new ConflictException(
        "Only pending extracted documents can be converted into incoming documents.",
      );

    await this.repository.updateStatus(
      id,
      ExtractedDocumentQueueStatus.APPROVED,
      manager,
    );
    return queue;
  }

  async delete(id: string, manager?: EntityManager): Promise<void> {
    const res = await this.repository.delete(id, manager);

    if (!res) throw new NotFoundException("Queue does not exist");
  }
}

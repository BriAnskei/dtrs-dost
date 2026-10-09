import { Injectable } from "@nestjs/common";
import { EntityManager } from "typeorm";
import { PaginatedResponse } from "../../../../common/pagination/paginated-response";
import { ExtractedDocumentQueueResponseDto } from "../dto/extracted-document-response-dto";
import { FindExtractedDocumentQueuesQueryDto } from "../dto/find-extracted-document-queues-query.dto";
import { FindMyExtractedDocumentQueuesQueryDto } from "../dto/find-my-extracted-document-queues-query.dto";
import { MyExtractedDocumentQueueResponseDto } from "../dto/my-extracted-document-queue-response-dto";
import { ExtractedDocumentQueueEntity } from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueRepository } from "../repository/extracted-document-queue.repository";

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
      data: result.data.map((queue) => this.toMyDto(queue)),
    };
  }
}

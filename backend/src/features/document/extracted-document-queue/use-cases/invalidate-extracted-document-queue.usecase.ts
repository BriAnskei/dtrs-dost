import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource } from "typeorm";
import { ExtractedDocumentQueueStatus } from "../entities/extracted-document-queue.entity";
import { ExtractedDocumentQueueRepository } from "../repository/extracted-document-queue.repository";
import { InvalidationResponseRepository } from "../repository/invalidation-response.repository";
export interface InvalidateExtractedDocumentQueueInput {
  queueId: string;
  response?: string;
}

@Injectable()
export class InvalidateExtractedDocumentQueueUseCase {
  constructor(
    private readonly dataSource: DataSource,
    private readonly queueRepository: ExtractedDocumentQueueRepository,
    private readonly invalidationResponseRepository: InvalidationResponseRepository,
  ) {}

  async execute(input: InvalidateExtractedDocumentQueueInput) {
    return this.dataSource.transaction(async (manager) => {
      const queue = await this.queueRepository.findOneForUpdate(input.queueId, manager);

      if (!queue) {
        throw new NotFoundException(
          `Extracted document queue "${input.queueId}" was not found.`,
        );
      }

      if (queue.status !== ExtractedDocumentQueueStatus.PENDING) {
        throw new ConflictException(
          `Cannot invalidate a queue with status "${queue.status}".`,
        );
      }

      await this.queueRepository.updateStatus(
        queue.id,
        ExtractedDocumentQueueStatus.INVALIDATED,
        manager,
      );

      const invalidationResponse = input.response
        ? await this.invalidationResponseRepository.create(
            { extracted_document_queue_id: queue.id, response: input.response },

            manager,
          )
        : null;

      return {
        id: queue.id,
        status: ExtractedDocumentQueueStatus.INVALIDATED,
        invalidation_response: invalidationResponse
          ? {
              id: invalidationResponse.id,
              response: invalidationResponse.response,
              created_at: invalidationResponse.created_at,
            }
          : null,
      };
    });
  }
}

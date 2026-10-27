import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { ExtractedDocumentQueueStatus } from "../../../extracted-document-queue/entities/extracted-document-queue.entity";
import { InvalidationResponseRepository } from "../../../extracted-document-queue/repository/invalidation-response.repository";
import { ExtractedDocumentQueueService } from "../../../extracted-document-queue/service/extracted-document-queue.service";
import {
  ReceiverIncomingDocumentDetailsDto,
  ReceiverInvalidationResponseDto,
} from "../../dto/get-receiver-queue-details.dto";
import { IncomingDocumentsRepository } from "../../repository/incoming-document.repository";
import { GetReceiverQueueDetailsQuery } from "./get-receiver-queue-details.query";

@QueryHandler(GetReceiverQueueDetailsQuery)
export class GetReceiverQueueDetailsHandler
  implements IQueryHandler<GetReceiverQueueDetailsQuery>
{
  constructor(
    private readonly extractedDocumentQueueService: ExtractedDocumentQueueService,
    private readonly incomingDocumentsRepository: IncomingDocumentsRepository,
    private readonly invalidationResponseRepository: InvalidationResponseRepository,
  ) {}

  async execute(
    query: GetReceiverQueueDetailsQuery,
  ): Promise<
    ReceiverIncomingDocumentDetailsDto | ReceiverInvalidationResponseDto | null
  > {
    const queue = await this.extractedDocumentQueueService.findOne(query.queueId);

    switch (queue.status) {
      case ExtractedDocumentQueueStatus.APPROVED: {
        const incoming = await this.incomingDocumentsRepository.findByDocumentFileId(
          queue.document_file_id,
        );

        if (!incoming) {
          return null;
        }

        return {
          subject: incoming.subject,
          from: incoming.document_from,
          to: incoming.recipient,
          date_received: incoming.date_received,
          summary: incoming.summary,
          updated_at: incoming.updated_at,
          created_at: incoming.created_at,
          status: incoming.status,
        };
      }

      case ExtractedDocumentQueueStatus.INVALIDATED: {
        const invalidation = await this.invalidationResponseRepository.findByQueueId(
          queue.id,
        );

        if (!invalidation) {
          return null;
        }

        return {
          response: invalidation.response,
          created_at: invalidation.created_at,
        };
      }

      default:
        return null;
    }
  }
}

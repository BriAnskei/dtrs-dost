import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type { CreateIncomingDocumentDto } from "../../extraction/admins/types/create-incoming-document";
import type { CreateIncomingFromQueueResponse } from "../types/create-incoming-from-queue.types";
import type {
  ExtractedDocumentQueue,
  ExtractedDocumentQueueDetail,
  FindExtractedDocumentQueuesParams,
} from "../types/extracted-document-queue.types";
import type { InvalidateExtractedQueuePayload } from "../types/invalidation-types";

const EXTRACTED_DOCUMENT_QUEUES_ENDPOINT = "/extracted-document-queue";

export const ExtractedQueueService = {
  async createIncomingFromQueue(
    queueId: string,
    payload: CreateIncomingDocumentDto,
    idempotencyKey: string,
  ): Promise<CreateIncomingFromQueueResponse> {
    const response = await apiClient.post<CreateIncomingFromQueueResponse>(
      `/incoming-documents/from-queue/${queueId}`,
      payload,
      {
        headers: {
          "Idempotency-Key": idempotencyKey,
        },
      },
    );

    return response.data;
  },

  async findAll(
    params: FindExtractedDocumentQueuesParams,
  ): Promise<PaginatedResponse<ExtractedDocumentQueue>> {
    const response = await apiClient.get<PaginatedResponse<ExtractedDocumentQueue>>(
      EXTRACTED_DOCUMENT_QUEUES_ENDPOINT,
      {
        params,
      },
    );

    return response.data;
  },

  async findOneForReview(id: string): Promise<ExtractedDocumentQueueDetail> {
    const response = await apiClient.get<ExtractedDocumentQueueDetail>(
      `${EXTRACTED_DOCUMENT_QUEUES_ENDPOINT}/${id}/review`,
    );

    return response.data;
  },

  async getFile(id: string): Promise<Blob> {
    const res = await apiClient.get<Blob>(
      `${EXTRACTED_DOCUMENT_QUEUES_ENDPOINT}/${id}/file`,
      {
        responseType: "blob",
      },
    );

    return res.data;
  },

  async invalidate(payload: InvalidateExtractedQueuePayload): Promise<void> {
    const { id, response } = payload;

    await apiClient.patch(`${EXTRACTED_DOCUMENT_QUEUES_ENDPOINT}/${id}/invalidate`, {
      response,
    });
  },
};

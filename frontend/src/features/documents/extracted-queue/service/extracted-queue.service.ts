import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type {
  ExtractedDocumentQueue,
  ExtractedDocumentQueueDetail,
  FindExtractedDocumentQueuesParams,
} from "../types/extracted-document-queue.types";

const EXTRACTED_DOCUMENT_QUEUES_ENDPOINT = "/extracted-document-queue";

export const ExtractedQueueService = {
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

  async findOne(id: string): Promise<ExtractedDocumentQueueDetail> {
    const response = await apiClient.get<ExtractedDocumentQueueDetail>(
      `${EXTRACTED_DOCUMENT_QUEUES_ENDPOINT}/${id}`,
    );

    return response.data;
  },
};

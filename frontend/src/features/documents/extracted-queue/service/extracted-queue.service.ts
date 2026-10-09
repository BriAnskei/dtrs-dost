import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type {
  ExtractedDocumentQueue,
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
};

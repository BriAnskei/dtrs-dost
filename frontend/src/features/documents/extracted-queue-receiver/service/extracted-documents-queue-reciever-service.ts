import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type {
  FindMyExtractedDocumentQueuesParams,
  MyExtractedDocumentQueue,
} from "../types/extracted-queue-receiver-types";

export const ExtractedDocumentQueueReciverService = {
  async findMy(
    params: FindMyExtractedDocumentQueuesParams,
  ): Promise<PaginatedResponse<MyExtractedDocumentQueue>> {
    const response = await apiClient.get<PaginatedResponse<MyExtractedDocumentQueue>>(
      "/extracted-document-queue/my",
      {
        params,
      },
    );

    return response.data;
  },
};

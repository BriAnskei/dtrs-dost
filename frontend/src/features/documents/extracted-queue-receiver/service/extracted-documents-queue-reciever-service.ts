import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type {
  FindMyExtractedDocumentQueuesParams,
  MyExtractedDocumentQueue,
} from "../types/extracted-queue-receiver-types";
import type { ReceiverQueueDetailsDto } from "../types/get-incoming-document-by-queue.dto";

export const ExtractedDocumentQueueReceiverService = {
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

  async findQueueDetails(queueId: string): Promise<ReceiverQueueDetailsDto> {
    const response = await apiClient.get<ReceiverQueueDetailsDto>(
      `/incoming-documents/receiver-queue/${queueId}`,
    );

    return response.data;
  },

  async delete(queueId: string): Promise<void> {
    await apiClient.delete(`/extracted-document-queue/${queueId}`);
  },
};

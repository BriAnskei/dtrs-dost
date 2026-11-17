import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type {
  IncomingDocumentStatusHistory,
  IncomingDocumentStatusHistoryParams,
} from "../shared/types/incoming-document-status-history.types";
import type { UpdateIncomingDocumentStatusPayload } from "../shared/types/update-incoming-document-status.type";
import { INCOMING_DOCUMENTS_ENDPOINT } from "./incoming-document-service";

export const IncomingStatusService = {
  async updateIncomingDocumentStatus(
    id: string,
    payload: UpdateIncomingDocumentStatusPayload,
  ) {
    const { data } = await apiClient.patch(
      `${INCOMING_DOCUMENTS_ENDPOINT}/${id}/status`,
      payload,
    );

    return data;
  },

  async getIncomingDocumentStatusHistories(
    params: IncomingDocumentStatusHistoryParams,
    incomingDocumentId: string,
  ): Promise<PaginatedResponse<IncomingDocumentStatusHistory>> {
    const { data } = await apiClient.get<
      PaginatedResponse<IncomingDocumentStatusHistory>
    >(`${INCOMING_DOCUMENTS_ENDPOINT}/${incomingDocumentId}/status-histories`, {
      params,
    });

    return data;
  },
};

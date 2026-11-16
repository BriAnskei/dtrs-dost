import { apiClient } from "../../../../lib/api-client";
import type { UpdateIncomingDocumentStatusPayload } from "../shared/types/update-incoming-document-status.type";

export const IncomingStatusService = {
  async updateIncomingDocumentStatus(
    id: string,
    payload: UpdateIncomingDocumentStatusPayload,
  ) {
    const { data } = await apiClient.patch(`/incoming-documents/${id}/status`, payload);

    return data;
  },
};

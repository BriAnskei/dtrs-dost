import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type { AssignIncomingDocumentToDivisionDto } from "../types/assign-incoming-document-to-dto-division.type";
import type { AssignedDivisionNoticeCount } from "../types/assigned-division-notice-count-response";
import type {
  FindIncomingDocumentsParams,
  IncomingDocumentResponse,
} from "../types/incoming-document.type";

const INCOMING_DOCUMENTS_ENDPOINT = "/incoming-documents";

export const IncomingDocumentService = {
  async findAll(
    params: FindIncomingDocumentsParams,
  ): Promise<PaginatedResponse<IncomingDocumentResponse>> {
    const { data } = await apiClient.get<PaginatedResponse<IncomingDocumentResponse>>(
      INCOMING_DOCUMENTS_ENDPOINT,
      {
        params,
      },
    );

    return data;
  },

  async getFile(id: string, signal?: AbortSignal): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `${INCOMING_DOCUMENTS_ENDPOINT}/${id}/file`,
      {
        responseType: "blob",
        signal,
      },
    );

    return response.data;
  },

  async getAssignedDivisionNoticeCounts(
    incomingDocumentId: string,
  ): Promise<AssignedDivisionNoticeCount[]> {
    const { data } = await apiClient.get<AssignedDivisionNoticeCount[]>(
      `${INCOMING_DOCUMENTS_ENDPOINT}/${incomingDocumentId}/assigned-division-notice-counts`,
    );

    return data;
  },

  async assignIncomingDocumentToDivision(
    dto: AssignIncomingDocumentToDivisionDto,
  ): Promise<void> {
    await apiClient.post(`${INCOMING_DOCUMENTS_ENDPOINT}/assign-to-division`, dto);
  },
};

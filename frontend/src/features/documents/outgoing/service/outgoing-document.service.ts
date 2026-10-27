import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type {
  FindOutgoingDocumentsParams,
  OutgoingDocumentResponse,
} from "../types/outgoing-document.type";

export const outgoingDocumentService = {
  async findAll(
    params: FindOutgoingDocumentsParams,
  ): Promise<PaginatedResponse<OutgoingDocumentResponse>> {
    const { data } = await apiClient.get<PaginatedResponse<OutgoingDocumentResponse>>(
      "/outgoing-documents",
      {
        params,
      },
    );

    return data;
  },
};

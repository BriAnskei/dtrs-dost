import { apiClient } from "../../../../lib/api-client";
import type {
  FindOutgoingDocumentsParams,
  OutgoingDocumentResponse,
  PaginatedResponse,
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

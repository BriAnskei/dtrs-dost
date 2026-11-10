import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type {
  DivisionIncomingDocument,
  FindDivisionIncomingDocumentsParams,
} from "../division-list/types/division-incoming-document.type";

const INCOMING_ROUTING_ENDPOINT = "incoming-document-routing";

export const DivisionIncomingDocumentService = {
  async findAll(
    params: FindDivisionIncomingDocumentsParams,
  ): Promise<PaginatedResponse<DivisionIncomingDocument>> {
    const { data } = await apiClient.get<PaginatedResponse<DivisionIncomingDocument>>(
      `${INCOMING_ROUTING_ENDPOINT}/division`,
      {
        params,
      },
    );

    return data;
  },
};

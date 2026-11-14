import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type { IncomingDocumentAssignment } from "../detials-page/assignment/types/incoming-document-assignment";
import type { GetDivisionIncomingDocumentAssignmentsParams } from "../division-details-page/assignment/types/division-incoming-document-assignment";
import type {
  DivisionIncomingDocument,
  FindDivisionIncomingDocumentsParams,
} from "../division-list/types/division-incoming-document.type";
import type { RoutedIncomingDocumentDetailsDto } from "../types/get-division-incoming-document-details";

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

  async getDivisionIncomingDocumentDetails(
    incomingDocumentId: string,
    signal?: AbortSignal,
  ): Promise<RoutedIncomingDocumentDetailsDto> {
    const { data } = await apiClient.get<RoutedIncomingDocumentDetailsDto>(
      `${INCOMING_ROUTING_ENDPOINT}/${incomingDocumentId}/division/details`,
      { signal },
    );

    return data;
  },

  async getDivisionIncomingDocumentAssignments(
    incomingDocumentId: string,
    params?: GetDivisionIncomingDocumentAssignmentsParams,
    cursor?: string,
  ): Promise<PaginatedResponse<IncomingDocumentAssignment>> {
    const { data } = await apiClient.get<PaginatedResponse<IncomingDocumentAssignment>>(
      `${INCOMING_ROUTING_ENDPOINT}/division/${incomingDocumentId}/assignments`,
      {
        params: {
          ...params,
          cursor,
        },
      },
    );

    return data;
  },

  async startAssignment(assignmentId: string): Promise<void> {
    await apiClient.patch(
      `${INCOMING_ROUTING_ENDPOINT}/assignments/${assignmentId}/start`,
    );
  },
};

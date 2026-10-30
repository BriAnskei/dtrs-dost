import { apiClient } from "../../../../lib/api-client";
import type { PaginatedResponse } from "../../../../type/paginated-response.type";
import type { AssignIncomingDocumentToDivisionDto } from "../types/assign-incoming-document-to-dto-division.type";
import type { AssignedDivisionNoticeCount } from "../types/assigned-division-notice-count-response";
import type { CreateIncomingDocumentAssignmentsDto } from "../types/create-incoming-document-assignments-dto";
import type {
  FindIncomingDocumentsParams,
  IncomingDocumentResponse,
} from "../types/incoming-document.type";
import type { IncomingDocumentDetails } from "../types/incoming-document-details.type";
import type { RoutedDivisionAssignment } from "../types/routed-division-assignments.type";

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

  async getFullDetailsById(id: string): Promise<IncomingDocumentDetails> {
    const { data } = await apiClient.get<IncomingDocumentDetails>(
      `/incoming-documents/${id}`,
    );

    return data;
  },

  async getIncomingDocumentAssignmentsByRoutingId(
    routingId: string,
  ): Promise<RoutedDivisionAssignment[]> {
    const { data } = await apiClient.get<RoutedDivisionAssignment[]>(
      `/incoming-documents/${routingId}/assignments`,
    );

    return data;
  },

  async assignIncomingDocumentToDivision(
    dto: AssignIncomingDocumentToDivisionDto,
  ): Promise<void> {
    await apiClient.post(`${INCOMING_DOCUMENTS_ENDPOINT}/assign-to-division`, dto);
  },

  async createIncomingDocumentAssignments(
    incomingDocumentId: string,
    dto: CreateIncomingDocumentAssignmentsDto,
  ): Promise<void> {
    await apiClient.post(`/incoming-documents/${incomingDocumentId}/assignments`, dto);
  },
};

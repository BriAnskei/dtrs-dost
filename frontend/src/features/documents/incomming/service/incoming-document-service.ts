import { apiClient } from "../../../../lib/api-client";
import type {
  FindIncomingDocumentsParams,
  IncomingDocumentsPage,
} from "../types/incoming-document.type";

export const incomingDocumentService = {
  async findAll(params: FindIncomingDocumentsParams): Promise<IncomingDocumentsPage> {
    const { data } = await apiClient.get<IncomingDocumentsPage>("/incoming-documents", {
      params,
    });

    return data;
  },
};

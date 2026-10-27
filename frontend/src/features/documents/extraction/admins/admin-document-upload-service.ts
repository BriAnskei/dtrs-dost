import { apiClient } from "../../../../lib/api-client";
import type {
  CreateIncomingDocumentInput,
  CreateIncomingDocumentResponse,
} from "./types/create-incoming-document";
import type {
  CreateOutgoingDocumentInput,
  CreateOutgoingDocumentResponse,
} from "./types/create-outgoing-document";

export const AdminDocumentUploadService = {
  async createOutgoingDocument({
    file,
    dto,
    idempotencyKey,
  }: CreateOutgoingDocumentInput & { idempotencyKey: string }): Promise<CreateOutgoingDocumentResponse> {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("subject", dto.subject);
    formData.append("to", dto.to);
    formData.append("date_prepared", dto.date_prepared);
    formData.append("date_received", dto.date_received);
    formData.append("received_by", dto.received_by);
    formData.append("summary", dto.summary);

    const { data } = await apiClient.post<CreateOutgoingDocumentResponse>(
      "/outgoing-documents",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          "Idempotency-Key": idempotencyKey,
        },
      },
    );

    return data;
  },

  async createIncomingDocument({
    file,
    dto,
    idempotencyKey,
  }: CreateIncomingDocumentInput & { idempotencyKey: string }): Promise<CreateIncomingDocumentResponse> {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("subject", dto.subject);
    formData.append("document_from", dto.document_from);
    formData.append("recipient", dto.recipient);
    formData.append("date_received", dto.date_received);
    formData.append("summary", dto.summary);

    const { data } = await apiClient.post<CreateIncomingDocumentResponse>(
      "/incoming-documents",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          "Idempotency-Key": idempotencyKey,
        },
      },
    );

    return data;
  },
};

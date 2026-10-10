import { apiClient } from "../../../../lib/api-client";
import type {
  CreateOutgoingDocumentDto,
  CreateOutgoingDocumentResponse,
} from "./types/create-outgoing-document";

interface CreateOutgoingDocumentInput {
  file: File;
  dto: CreateOutgoingDocumentDto;
}
export const AdminsUploadService = {
  async createOutgoingDocument({
    file,
    dto,
  }: CreateOutgoingDocumentInput): Promise<CreateOutgoingDocumentResponse> {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("subject", dto.subject);
    formData.append("to", dto.to);

    if (dto.date_prepared) {
      formData.append("date_prepared", dto.date_prepared);
    }

    if (dto.date_received) {
      formData.append("date_received", dto.date_received);
    }

    if (dto.received_by) {
      formData.append("received_by", dto.received_by);
    }

    if (dto.summary) {
      formData.append("summary", dto.summary);
    }

    const { data } = await apiClient.post<CreateOutgoingDocumentResponse>(
      "/outgoing-documents",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return data;
  },
};

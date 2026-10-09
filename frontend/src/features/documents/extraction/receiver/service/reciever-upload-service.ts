import { apiClient } from "../../../../../lib/api-client";
import type {
  ReceiverUploadRequest,
  ReceiverUploadResponse,
} from "../types/reciever-upload-api-types";

export const receiverUploadService = {
  async upload({ file, chunks }: ReceiverUploadRequest): Promise<ReceiverUploadResponse> {
    const form = new FormData();

    form.append("file", file);
    form.append("chunks", JSON.stringify(chunks));

    const { data } = await apiClient.post<ReceiverUploadResponse>(
      "/extracted-document-queue",
      form,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return data;
  },
};

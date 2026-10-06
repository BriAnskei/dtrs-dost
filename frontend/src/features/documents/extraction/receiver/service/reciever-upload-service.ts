import { apiClient } from "../../../../../lib/api-client";
import type { FieldExtraction } from "../../service/extraction-service";

export interface ReceiverChunk {
  chunkId: string;
  text: string;
  /** 0-100 integer, required by ReceiverChunkDto */
  sourceConfidence: number;
}

export interface ReceiverUploadRequest {
  file: File;
  chunks: ReceiverChunk[];
}

export interface ReceiverUploadResponse {
  queueId: string;
  documentFileId: string;
  fields: FieldExtraction[];
}

export const receiverUploadService = {
  async upload({ file, chunks }: ReceiverUploadRequest): Promise<ReceiverUploadResponse> {
    const form = new FormData();
    form.append("file", file); // must match FileInterceptor("file")
    form.append("chunks", JSON.stringify(chunks));

    const { data } = await apiClient.post<ReceiverUploadResponse>(
      "/extracted-document-queue",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
};

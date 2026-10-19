import { apiClient } from "../../lib/api-client";

const DOCUMENT_FILES_ENDPOINT = "document-files";

export const DocumentFileService = {
  async getFile(id: string): Promise<Blob> {
    const res = await apiClient.get<Blob>(`${DOCUMENT_FILES_ENDPOINT}/${id}/file`, {
      responseType: "blob",
    });

    return res.data;
  },
};

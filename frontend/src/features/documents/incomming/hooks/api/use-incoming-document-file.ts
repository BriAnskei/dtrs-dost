import { useQuery } from "@tanstack/react-query";
import { IncomingDocumentService } from "../../service/incoming-document-service";

interface UseIncomingDocumentFileOptions {
  id: string | undefined;
  enabled: boolean;
}

export function useIncomingDocumentFile({ id, enabled }: UseIncomingDocumentFileOptions) {
  return useQuery({
    queryKey: ["extracted-document-queue", id, "file"],
    queryFn: ({ signal }) => {
      if (!id) {
        throw new Error("Incoming document ID is required.");
      }

      return IncomingDocumentService.getFile(id, signal);
    },
    enabled: enabled && Boolean(id),
    staleTime: 5 * 60_000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

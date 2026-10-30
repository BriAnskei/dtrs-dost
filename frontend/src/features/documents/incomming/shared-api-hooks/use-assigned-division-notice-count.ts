import { useQuery } from "@tanstack/react-query";
import { IncomingDocumentService } from "../service/incoming-document-service";

export const useAssignedDivisionNoticeCounts = (
  incomingDocumentId: string | undefined,
  enabled = true,
) => {
  return useQuery({
    queryKey: ["assigned-division-notice-counts", incomingDocumentId],
    queryFn: () => {
      if (!incomingDocumentId) {
        throw new Error("Incoming document ID is required.");
      }
      return IncomingDocumentService.getAssignedDivisionNoticeCounts(incomingDocumentId);
    },
    staleTime: 5 * 60_000,
    enabled: enabled && !!incomingDocumentId,
  });
};

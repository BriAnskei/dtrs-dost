import { useQuery } from "@tanstack/react-query";
import { IncomingDocumentService } from "../../../../service/incoming-document-service";
import type { GetIncomingDocumentAssignmentsParams } from "../../types/incoming-document-assignment";

export const useIncomingDocumentAssignments = (
  incomingDocumentId: string,
  params?: GetIncomingDocumentAssignmentsParams,
) => {
  return useQuery({
    queryKey: ["incoming-document-assignments", incomingDocumentId, params],
    queryFn: () =>
      IncomingDocumentService.getIncomingDocumentAssignments(incomingDocumentId, params),
    enabled: Boolean(incomingDocumentId),
    staleTime: 5 * 60_000,
  });
};

import { useQuery } from "@tanstack/react-query";
import { DivisionIncomingDocumentService } from "../../../service/division-incoming-document-service";

interface UseDivisionIncomingDocumentDetailsParams {
  incomingDocumentId: string;
}

export function useDivisionIncomingDocumentDetails({
  incomingDocumentId,
}: UseDivisionIncomingDocumentDetailsParams) {
  return useQuery({
    queryKey: ["division-incoming-document-details", incomingDocumentId],
    queryFn: ({ signal }) =>
      DivisionIncomingDocumentService.getDivisionIncomingDocumentDetails(
        incomingDocumentId,
        signal,
      ),
    enabled: Boolean(incomingDocumentId),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

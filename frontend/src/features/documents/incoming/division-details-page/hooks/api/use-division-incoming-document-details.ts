import { useQuery } from "@tanstack/react-query";
import { DivisionIncomingDocumentService } from "../../../service/division-incoming-document-service";

interface UseDivisionIncomingDocumentDetailsParams {
  incomingDocumentId: string;
  divisionId: string;
}

export function useDivisionIncomingDocumentDetails({
  incomingDocumentId,
  divisionId,
}: UseDivisionIncomingDocumentDetailsParams) {
  return useQuery({
    queryKey: ["division-incoming-document-details", incomingDocumentId, divisionId],
    queryFn: ({ signal }) =>
      DivisionIncomingDocumentService.getDivisionIncomingDocumentDetails(
        incomingDocumentId,
        divisionId,
        signal,
      ),
    enabled: Boolean(incomingDocumentId) && Boolean(divisionId),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

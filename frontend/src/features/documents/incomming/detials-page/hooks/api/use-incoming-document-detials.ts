import { useQuery } from "@tanstack/react-query";
import { IncomingDocumentService } from "../../../service/incoming-document-service";

export function useIncomingDocumentDetails(id: string) {
  return useQuery({
    queryKey: ["incoming-documents", "details"],
    queryFn: () => IncomingDocumentService.getFullDetailsById(id),
    enabled: Boolean(id),
    staleTime: 5 * 60 * 1000,
  });
}

import { useQuery } from "@tanstack/react-query";
import { IncomingDocumentService } from "../../../service/incoming-document-service";

export function useIncomingDocumentDetails(id: string) {
  return useQuery({
    queryKey: ["incoming-documents", "details", id],
    queryFn: () => IncomingDocumentService.getFullDetailsById(id),
    enabled: Boolean(id),
  });
}

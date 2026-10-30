import { useQuery } from "@tanstack/react-query";
import { IncomingDocumentService } from "../../../service/incoming-document-service";

export const useIncomingDocumentAssignmentsByRoutingId = (routingId: string) => {
  return useQuery({
    queryKey: ["incoming-document-assignments", routingId],
    queryFn: () =>
      IncomingDocumentService.getIncomingDocumentAssignmentsByRoutingId(routingId),
    enabled: Boolean(routingId),
    staleTime: 5 * 60 * 1000,
  });
};

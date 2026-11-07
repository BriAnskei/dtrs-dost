import { useQuery } from "@tanstack/react-query";
import { IncomingDocumentService } from "../../../../service/incoming-document-service";

interface UseSearchRoutedDivisionsOptions {
  incomingDocumentId: string;
  search: string;
}

export const useSearchRoutedDivisions = ({
  incomingDocumentId,
  search,
}: UseSearchRoutedDivisionsOptions) => {
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: [
      "incoming-document",
      incomingDocumentId,
      "routed-divisions",
      normalizedSearch,
    ],

    queryFn: ({ signal }) =>
      IncomingDocumentService.searchRoutedDivisions(
        incomingDocumentId,
        normalizedSearch,
        signal,
      ),

    enabled: Boolean(incomingDocumentId) && normalizedSearch.length >= 2,

    staleTime: 5 * 60 * 1000,

    retry: 1,
  });
};

import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { divisionSearchNameService } from "../services/divisionSearchName.service";

export function useSearchDivisions(search: string) {
  const [debounceSearch] = useDebounce(search, 500);

  const normalizedSearch = debounceSearch.trim();

  const query = useQuery({
    queryKey: ["division", "search", normalizedSearch],
    queryFn: () => divisionSearchNameService.find(normalizedSearch),
    enabled: normalizedSearch.length >= 2,
    staleTime: 30_000,
  });

  // True while the user's latest keystrokes haven't reached the query yet.
  return { ...query, isDebouncing: search.trim() !== normalizedSearch };
}

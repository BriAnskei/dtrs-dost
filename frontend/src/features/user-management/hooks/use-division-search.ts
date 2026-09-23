import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { divisionSearchNameService } from "../services/divisionSearchName.service";

export function useSearchDivisions(search: string) {
  const [debounceSearch] = useDebounce(search, 500);

  const normalizedSearch = debounceSearch.trim();

  return useQuery({
    queryKey: ["division", "search", normalizedSearch],
    queryFn: () => divisionSearchNameService.find(normalizedSearch),
    enabled: normalizedSearch.length >= 2,
    staleTime: 30_000,
  });
}

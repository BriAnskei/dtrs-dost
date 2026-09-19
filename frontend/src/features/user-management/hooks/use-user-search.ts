import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { userService } from "../service/user.service";

export function useUserSearch(search: string) {
  const [debounceSearch] = useDebounce(search, 500);

  const normalizedSearch = debounceSearch.trim();

  return useQuery({
    queryKey: ["user", "search", normalizedSearch],
    queryFn: () => userService.searchByName(normalizedSearch),
    enabled: normalizedSearch.length >= 2,
    staleTime: 30_000,
  });
}

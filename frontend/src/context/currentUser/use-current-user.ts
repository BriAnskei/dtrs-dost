import { useQuery } from "@tanstack/react-query";
import { currentUserService } from "./current-user.service";

export const CURRENT_USER_QUERY_KEY = ["current-user"] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: currentUserService.getCurrentUser,
    staleTime: Infinity,
    retry: false,
  });
}

import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useCallback, useEffect, useMemo } from "react";
import { AUTH_SESSION_EXPIRED } from "../../features/auth/authentication/authentication.events";
import { isNetworkError } from "../../lib/api-error";
import type { User } from "./curr-user.type";
import { CURRENT_USER_QUERY_KEY, useCurrentUser } from "./use-current-user";
import { UserContext } from "./user-context";

export function UserProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: currentUser = null, isLoading, error } = useCurrentUser();

  const serverError = error ? isNetworkError(error) : false;

  const setCurrentUser = useCallback(
    (user: User | null) => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
    },
    [queryClient],
  );

  const clear = useCallback(() => {
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
  }, [queryClient]);

  // A retry from the "server unreachable" screen is just a hard reload.
  // The whole provider re-mounts and re-resolves the session fresh.
  const refetch = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    if (!error) return;

    if (!isNetworkError(error)) {
      // Auth failure (401 / 403 after refresh attempts): the session is
      // genuinely gone, so there is no user to keep around.
      console.error("Failed to fetch current user:", error);

      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
    }
  }, [error, queryClient]);

  useEffect(() => {
    const handleSessionExpired = () => {
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, null);
    };

    window.addEventListener(AUTH_SESSION_EXPIRED, handleSessionExpired);

    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED, handleSessionExpired);
    };
  }, [queryClient]);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      clear,
      isLoading,
      serverError,
      refetch,
    }),
    [currentUser, setCurrentUser, clear, isLoading, serverError, refetch],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

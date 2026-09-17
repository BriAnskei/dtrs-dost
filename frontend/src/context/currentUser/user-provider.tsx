import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { AUTH_SESSION_EXPIRED } from "../../features/authentication/authentication.events";
import { isNetworkError } from "../../lib/api-error";
import type { User } from "./curr-user.type";
import { currentUserService } from "./current-user.service";
import { UserContext } from "./user-context";

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const [serverError, setServerError] = useState(false);

  // A retry from the "server unreachable" screen is just a hard reload: the
  // whole provider re-mounts and re-resolves the session fresh. This sidesteps
  // any mid-flight state where currentUser is null but serverError is false —
  // which would otherwise let ProtectedRoute bounce to /signin while the
  // retry is still in flight.
  const refetch = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchCurrentUser() {
      try {
        const user = await currentUserService.getCurrentUser();

        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (error) {
        if (!isMounted) return;

        if (isNetworkError(error)) {
          // Connectivity failure (server down / offline). This is NOT a session
          // problem, so don't null-out the user or bounce to /signin — keep the
          // recovery screen up instead. The interceptor already toasted.
          setServerError(true);
        } else {
          // Auth failure (401 / 403 after refresh attempts): the session is
          // genuinely gone, so there's no user to keep around.
          console.error("Failed to fetch current user:", error);
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleSessionExpired = () => {
      setCurrentUser(null);
    };

    window.addEventListener(AUTH_SESSION_EXPIRED, handleSessionExpired);

    return () => {
      window.removeEventListener(AUTH_SESSION_EXPIRED, handleSessionExpired);
    };
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      clear: () => setCurrentUser(null),
      isLoading,
      serverError,
      refetch,
    }),
    [currentUser, isLoading, serverError, refetch],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { AUTH_SESSION_EXPIRED } from "../../features/authentication/authentication.events";
import type { User } from "../../features/userManagement/type/user.type";
import { currentUserService } from "./current-user.service";
import { UserContext } from "./user-context";

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchCurrentUser() {
      try {
        const user = await currentUserService.getCurrentUser();

        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (error) {
        if (isMounted) {
          setCurrentUser(null);
        }

        if (error instanceof Error) {
          console.error("Failed to fetch current user:", error);
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
      isLoading,
      clear: () => setCurrentUser(null),
    }),
    [currentUser, isLoading],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

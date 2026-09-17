import { createContext } from "react";
import type { User } from "./curr-user.type";

export type UserContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  clear: () => void;
  isLoading: boolean;
  /**
   * True when the current-user fetch failed with a transport-level error
   * (server down, offline, DNS, timeout, empty response). Exposed so
   * ProtectedRoute can render a recoverable "server unreachable" screen
   * instead of silently bouncing to /signin.
   */
  serverError: boolean;
  /** Re-runs the current-user fetch (used by the "server unreachable" retry). */
  refetch: () => void;
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

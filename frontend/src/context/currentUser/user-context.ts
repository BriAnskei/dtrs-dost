import { createContext } from "react";
import type { User } from "../../features/userManagement/type/user.type";

export type UserContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  clear: () => void;
  isLoading: boolean;
};

export const UserContext = createContext<UserContextType | undefined>(undefined);

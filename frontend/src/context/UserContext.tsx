import type React from "react";
import { createContext, useContext, useState } from "react";

export type Roles = 1 | 2 | 3 | 4; // super admin, admin, recieving_officer, division

type UserContextType = {
  role: Roles | undefined;
  setCurrUser: (role: string) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Roles | undefined>(() => {
    const storedRole = sessionStorage.getItem("role");

    return storedRole ? (Number(storedRole) as Roles) : undefined;
  });

  const setCurrUser = (role: string) => {
    const roles: Record<string, Roles> = {
      super_admin: 1,
      admin: 2,
      receiver: 3,
      division: 4,
    };

    const currRole = roles[role];

    setRole(currRole);

    if (currRole) {
      sessionStorage.setItem("role", currRole.toString());
    }
  };

  const logout = () => {
    sessionStorage.clear();
  };

  return (
    <UserContext.Provider
      value={{
        role,
        setCurrUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const userUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("userUser must be used within a UserProvider");
  }
  return context;
};

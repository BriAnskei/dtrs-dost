import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

export type Roles = 1 | 2 | 3 | 4; // super_admin, admin, receiver_officer, division

export type RoleName = "super_admin" | "admin" | "receiver_officer" | "division";

interface RoleUserMap {
  super_admin: string;
  admin: string;
  receiver_officer: string;
  division: string;
}

export const roleUserMap: RoleUserMap = {
  super_admin: "54191de9-e538-44a5-b5b5-6d70b14cb37c",
  admin: "bbf01f13-7e98-4128-9606-743e67155344z",
  receiver_officer: "efc6bac3-5b56-4eec-ab4e-d5319b9ec36b",
  division: "802ee72e-eade-45f3-ac9b-1417ff5d3c05",
};

type UserContextType = {
  role: Roles | undefined;
  userId: string | undefined;
  setCurrUser: (role: RoleName) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Roles | undefined>(() => {
    const storedRole = sessionStorage.getItem("role");

    return storedRole ? (Number(storedRole) as Roles) : undefined;
  });

  const [userId, setUserId] = useState<string | undefined>(() => {
    const storedUserId = sessionStorage.getItem("userId");
    return storedUserId ?? undefined;
  });

  const setCurrUser = (roleName: RoleName) => {
    const roles: Record<RoleName, Roles> = {
      super_admin: 1,
      admin: 2,
      receiver_officer: 3,
      division: 4,
    };

    const currRole = roles[roleName];
    const currUserId = roleUserMap[roleName];

    setRole(currRole);
    setUserId(currUserId);

    if (currRole) {
      sessionStorage.setItem("role", currRole.toString());
    }
    if (currUserId) {
      sessionStorage.setItem("userId", currUserId);
    }
  };

  useEffect(() => {
    console.log("userId: ", userId);
  }, [userId]);

  const logout = () => {
    sessionStorage.clear();
    setRole(undefined);
    setUserId(undefined);
  };

  return (
    <UserContext.Provider
      value={{
        role,
        userId,
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

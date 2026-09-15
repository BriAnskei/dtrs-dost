import type React from "react";
import { Navigate } from "react-router";
import { useUser } from "../context/currentUser/user-user";
import type { Roles } from "../features/user-management/type/user.type";

interface Props {
  children: React.ReactNode;
  allowedRoles: Roles[];
}

export default function RoleRoute({ children, allowedRoles }: Props) {
  const { currentUser } = useUser();

  if (!currentUser) {
    return <Navigate to="/signin" />;
  }

  const role = currentUser.role_id;

  // awkward to show a non unauthorized for the super admin
  if (!allowedRoles.includes(role) && role === 1) return <Navigate to="/notfound" />;
  else if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}

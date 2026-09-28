import type React from "react";
import { Navigate } from "react-router";
import type { User } from "../../../context/currentUser/curr-user.type";
import { useUser } from "../../../context/currentUser/use-user";

interface Props {
  children: React.ReactNode;
  hasPermission: (user: User) => boolean;
}

export default function PermissionRoute({ children, hasPermission }: Props) {
  const { currentUser } = useUser();

  if (!currentUser) {
    return <Navigate to="/signin" replace />;
  }

  // Super Admin bypasses permission checks
  if (currentUser.role_id === 1) {
    return children;
  }

  if (!hasPermission(currentUser)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

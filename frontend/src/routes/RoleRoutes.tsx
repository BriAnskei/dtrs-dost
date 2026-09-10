import type React from "react";
import { Navigate } from "react-router";
import { type Roles, userUser } from "../context/UserContext";

interface Props {
  children: React.ReactNode;
  allowedRoles: Roles[];
}

export default function RoleRoute({ children, allowedRoles }: Props) {
  const { role } = userUser();

  // if (!role) {
  //   return <Navigate to="/signin" />;
  // }
  //
  // // awkward to show a non unauthorized for the super admin
  // if (!allowedRoles.includes(role) && role === 1) return <Navigate to="/notfound" />;
  // else if (!allowedRoles.includes(role)) {
  //   return <Navigate to="/unauthorized" />;
  // }

  return children;
}

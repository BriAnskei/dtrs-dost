import type React from "react";
import { Navigate } from "react-router";
import { userUser } from "../context/UserContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = userUser();

  // if (!user.role) {
  //   return <Navigate to="/signin" />;
  // }

  return children;
}

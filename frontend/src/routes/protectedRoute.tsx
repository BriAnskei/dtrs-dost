import type React from "react";
import { Navigate } from "react-router";
import AppShellSkeleton from "../components/Appshellskeleton";
import { useUser } from "../context/currentUser/user-user";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useUser();

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  if (!currentUser) {
    return <Navigate to="/signin" replace />;
  }

  if (!currentUser && !isLoading) return <Navigate to="/signin" />;

  return children;
}

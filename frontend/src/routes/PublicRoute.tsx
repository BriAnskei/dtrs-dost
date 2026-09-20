import type React from "react";
import { Navigate } from "react-router";
import AppShellSkeleton from "../components/Appshellskeleton";
import { useUser } from "../context/currentUser/use-user";

export default function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useUser();

  if (isLoading) return <AppShellSkeleton />;

  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  return children;
}

import type React from "react";
import { Navigate } from "react-router";
import AppShellSkeleton from "../components/Appshellskeleton";
import ServerUnavailable from "../components/common/ServerUnavailable";
import { useUser } from "../context/currentUser/use-user";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading, serverError } = useUser();

  if (isLoading) {
    return <AppShellSkeleton />;
  }

  // Transport-level failure resolving the session: server is down / offline.
  // Do NOT treat this like being signed out — show a recoverable screen.
  if (serverError) {
    return <ServerUnavailable />;
  }

  if (!currentUser && !isLoading) return <Navigate to="/signin" />;

  return children;
}

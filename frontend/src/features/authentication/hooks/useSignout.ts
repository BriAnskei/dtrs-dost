import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { authenticationService } from "../authentication.service";
import { clearAuthenticated } from "../authentication.session";

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: authenticationService.signOut,

    onSuccess: () => {
      clearAuthenticated();
      queryClient.clear();

      navigate("/signin", {
        replace: true,
      });
    },
  });

  function logout() {
    logoutMutation.mutate();
  }

  return {
    // Logout state
    logout,
    isLoggingOut: logoutMutation.isPending,
    logoutError: logoutMutation.error,
  };
}

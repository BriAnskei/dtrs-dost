import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useUser } from "../../../context/currentUser/use-user";
import { authenticationService } from "../service/authentication.service";
import { clearAuthenticated } from "../authentication.session";

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { clear: clearUser } = useUser();

  const logoutMutation = useMutation({
    mutationFn: authenticationService.signOut,

    // Do not retry logout automatically.
    retry: false,

    onSuccess: () => {
      clearUser();
      clearAuthenticated();
      queryClient.clear();

      navigate("/signin", {
        replace: true,
      });
    },

    onError: (error) => {
      console.error("Logout failed:", error);

      toast.error("Logout failed", {
        description: "Could not connect to the server. Please try again.",
        id: "logout-error",
      });
    },
  });

  function logout() {
    logoutMutation.mutate();
  }

  return {
    logout,
    isLoggingOut: logoutMutation.isPending,
    logoutError: logoutMutation.error,
  };
}

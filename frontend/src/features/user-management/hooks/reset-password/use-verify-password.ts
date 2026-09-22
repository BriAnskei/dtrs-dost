import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { getErrorMessage } from "../../../../lib/api-error";
import { authenticationService } from "../../../authentication/service/authentication.service";

export function useVerifyPasswordStep(onVerified: () => void) {
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState<string | undefined>();
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const verifyPasswordMutation = useMutation({
    mutationFn: (password: string) => authenticationService.verifyPassword(password),
    onSuccess: onVerified,
    onError: (err) => setAdminPasswordError(getErrorMessage(err, "Incorrect password.")),
  });

  function handleVerifyPassword() {
    if (!adminPassword.trim()) {
      setAdminPasswordError("Enter your password to continue.");
      return;
    }
    setAdminPasswordError(undefined);
    verifyPasswordMutation.mutate(adminPassword);
  }

  return {
    adminPassword,
    setAdminPassword,
    adminPasswordError,
    setAdminPasswordError,
    showAdminPassword,
    setShowAdminPassword,
    isVerifying: verifyPasswordMutation.isPending,
    handleVerifyPassword,
  };
}

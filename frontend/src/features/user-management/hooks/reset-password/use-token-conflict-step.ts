import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "../../../../lib/api-error";
import { passwordResetService } from "../../services/password-reset.service";
import type { ResetPasswordMethod } from "./use-reset-password-modal";

interface Args {
  onResolved: (pendingMethod: ResetPasswordMethod) => void;
}

export function useTokenConflictStep({ onResolved }: Args) {
  const deleteExistingMutation = useMutation({
    mutationFn: (id: string) => passwordResetService.deletePasswordResetToken(id),
  });

  function resolveAndRetry(existingId: string, pendingMethod: ResetPasswordMethod) {
    deleteExistingMutation.mutate(existingId, {
      onSuccess: () => onResolved(pendingMethod),
      onError: (err) =>
        toast.error(getErrorMessage(err, "Could not cancel the existing reset request.")),
    });
  }

  return {
    resolveAndRetry,
    isResolvingConflict: deleteExistingMutation.isPending,
  };
}

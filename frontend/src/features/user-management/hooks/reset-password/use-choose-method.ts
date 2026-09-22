import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "../../../../lib/api-error";
import {
  getConflictBody,
  passwordResetService,
} from "../../service/password-reset.service";
import type {
  PasswordResetRequestResponse,
  PasswordResetTokenSummary,
} from "../../type/password-reset.type";
import type { ResetPasswordMethod } from "./use-reset-password-modal";

interface Args {
  userId: string;
  onExistingTokenFound: (
    existing: PasswordResetTokenSummary,
    pendingMethod: ResetPasswordMethod,
  ) => void;
  onDirectReady: () => void;
  onLinkCreated: (data: PasswordResetRequestResponse) => void;
}

/**
 * Owns the "which method, and is one already pending" decision. Every method
 * choice — direct or link — first checks for an existing token for this
 * user, since only one reset process should be in flight at a time.
 */
export function useChooseMethodStep({
  userId,
  onExistingTokenFound,
  onDirectReady,
  onLinkCreated,
}: Args) {
  const checkExistingMutation = useMutation({
    mutationFn: () => passwordResetService.getByUserId(userId),
  });

  const createLinkMutation = useMutation({
    mutationFn: () => passwordResetService.createResetRequest(userId),
    onSuccess: onLinkCreated,
    onError: (err) => {
      const conflict = getConflictBody(err);
      if (conflict) {
        onExistingTokenFound(
          { id: conflict.id, user_id: userId, expires_at: conflict.expires_at },
          "link",
        );
      } else {
        toast.error(getErrorMessage(err, "Could not generate a reset link."));
      }
    },
  });

  // Skips the existence check — used right after a conflicting token has
  // just been deleted, to resume whichever method the admin originally picked.
  function proceedWithMethod(method: ResetPasswordMethod) {
    if (method === "direct") onDirectReady();
    else createLinkMutation.mutate();
  }

  async function selectMethod(method: ResetPasswordMethod) {
    const existing = await checkExistingMutation.mutateAsync();
    if (existing) {
      onExistingTokenFound(existing, method);
      return;
    }
    proceedWithMethod(method);
  }

  return {
    selectMethod,
    proceedWithMethod,
    isCheckingMethod: checkExistingMutation.isPending || createLinkMutation.isPending,
  };
}

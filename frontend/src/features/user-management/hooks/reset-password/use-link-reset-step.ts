import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "../../../../lib/api-error";
import { passwordResetService } from "../../service/password-reset.service";
import type { PasswordResetRequestResponse } from "../../type/password-reset.type";

export function useLinkResetStep(userId: string) {
  const [linkData, setLinkData] = useState<PasswordResetRequestResponse | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => passwordResetService.deletePasswordResetToken(id),
  });

  const generateLinkMutation = useMutation({
    mutationFn: () => passwordResetService.createResetRequest(userId),
    onSuccess: setLinkData,
    onError: (err) =>
      toast.error(getErrorMessage(err, "Could not generate a reset link.")),
  });

  function generateLink() {
    setLinkData(null);
    generateLinkMutation.mutate();
  }

  // Called when the admin backs out or closes the modal without the user
  // ever using the link — discard it so it doesn't block a future reset.
  async function abandon() {
    if (linkData) {
      try {
        await deleteMutation.mutateAsync(linkData.id);
      } catch (err) {
        toast.error(getErrorMessage(err, "Could not discard the reset link."));
        // decide below whether a failed delete should still let the user navigate away
      } finally {
        setLinkData(null);
      }
    }
  }

  const resetLinkUrl = linkData
    ? `${window.location.origin}/reset-password/${linkData.token}`
    : null;

  async function handleCopyLink() {
    if (!resetLinkUrl) return;
    try {
      await navigator.clipboard.writeText(resetLinkUrl);
      toast.success("Reset link copied to clipboard.");
    } catch {
      toast.error("Couldn't copy link.");
    }
  }

  return {
    linkData,
    setLinkData,
    linkToken: linkData?.token ?? null,
    linkExpiresAt: linkData ? new Date(linkData.expires_at) : null,
    isGeneratingLink: generateLinkMutation.isPending,
    isAbandoningLink: deleteMutation.isPending,
    resetLinkUrl,
    generateLink,
    handleCopyLink,
    abandon,
  };
}

// hooks/use-reset-password-modal.ts
import { useState } from "react";
import type { PasswordResetTokenSummary } from "../../type/password-reset.type";
import type { SystemUser } from "../../type/user.type";
import { useChooseMethodStep } from "./use-choose-method";
import { useDirectResetStep } from "./use-direct-reset-step";
import { useLinkResetStep } from "./use-link-reset-step";
import { useTokenConflictStep } from "./use-token-conflict-step";
import { useVerifyPasswordStep } from "./use-verify-password";

export type ResetPasswordStep = "verify" | "method" | "direct" | "link" | "conflict";
export type ResetPasswordMethod = "direct" | "link";

export function useResetPasswordModal(user: SystemUser, onClose: () => void) {
  const [step, setStep] = useState<ResetPasswordStep>("verify");
  const [method, setMethod] = useState<ResetPasswordMethod | null>(null);
  const [conflictInfo, setConflictInfo] = useState<{
    existing: PasswordResetTokenSummary;
    pendingMethod: ResetPasswordMethod;
  } | null>(null);

  const verify = useVerifyPasswordStep(() => setStep("method"));
  const link = useLinkResetStep(user.id);
  const direct = useDirectResetStep(user);

  const chooseMethod = useChooseMethodStep({
    userId: user.id,
    onExistingTokenFound: (existing, pendingMethod) => {
      setConflictInfo({ existing, pendingMethod });
      setStep("conflict");
    },
    onDirectReady: () => {
      setMethod("direct");
      setStep("direct");
    },
    onLinkCreated: (data) => {
      setMethod("link");
      link.setLinkData(data);
      setStep("link");
    },
  });

  const conflict = useTokenConflictStep({
    onResolved: (pendingMethod) => {
      setConflictInfo(null);
      chooseMethod.proceedWithMethod(pendingMethod);
    },
  });

  async function goBack() {
    if (step === "method") {
      setStep("verify");
    } else if (step === "direct") {
      setStep("method");
    } else if (step === "link") {
      if (link.isAbandoningLink) return;
      await link.abandon();
      setStep("method");
    } else if (step === "conflict") {
      setConflictInfo(null);
      setStep("method");
    }
  }

  function handleClose() {
    if (step === "link" && link.isAbandoningLink) return;
    onClose();
  }

  return {
    user,
    step,
    method,
    goBack,
    handleClose,
    isNavigatingBack: link.isAbandoningLink,

    conflictInfo,
    isResolvingConflict: conflict.isResolvingConflict,
    resolveConflict: () =>
      conflictInfo &&
      conflict.resolveAndRetry(conflictInfo.existing.id, conflictInfo.pendingMethod),

    selectMethod: chooseMethod.selectMethod,
    isCheckingMethod: chooseMethod.isCheckingMethod,

    ...verify,
    ...direct,
    ...link,
  };
}

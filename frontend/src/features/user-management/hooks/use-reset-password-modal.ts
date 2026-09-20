import { useRef, useState } from "react";
import { toast } from "sonner";
import type { SystemUser } from "../type/user.type";
import { passwordGenerator } from "../utils/passwordGenerator";

export type ResetPasswordStep = "verify" | "method" | "direct" | "link";
export type ResetPasswordMethod = "direct" | "link";

interface DirectResetForm {
  password: string;
  confirmPassword: string;
}

/**
 * State and flow logic for the **Reset Password** modal.
 *
 * Flow: verify (the acting super admin re-enters their own password) ->
 * method (direct set vs. shareable link/QR) -> direct | link.
 *
 * Companion `ResetPasswordModal` + step components call this hook and
 * render pure JSX — no `useState` lives in any of them.
 *
 * All mutations are stubbed with a fake delay for now. Swap each `TODO`
 * block for a real mutation once the endpoints exist — the surrounding
 * validation, loading and error state is already wired.
 */
export function useResetPasswordModal(user: SystemUser, onClose: () => void) {
  const [step, setStep] = useState<ResetPasswordStep>("verify");

  // ── Step 1: re-authenticate the acting admin ──────────────────────────
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState<string | undefined>();
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // ── Step 2: method choice ──────────────────────────────────────────────
  const [method, setMethod] = useState<ResetPasswordMethod | null>(null);

  // ── Step 3a: direct reset ───────────────────────────────────────────────
  const [directForm, setDirectForm] = useState<DirectResetForm>({
    password: "",
    confirmPassword: "",
  });
  const [directErrors, setDirectErrors] = useState<
    Partial<Record<keyof DirectResetForm, string>>
  >({});
  const [showDirectPassword, setShowDirectPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const directPasswordRef = useRef<HTMLInputElement>(null);

  // ── Step 3b: link / QR reset ───────────────────────────────────────────
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkExpiresAt, setLinkExpiresAt] = useState<Date | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  function handleVerifyPassword() {
    if (!adminPassword.trim()) {
      setAdminPasswordError("Enter your password to continue.");
      return;
    }
    setIsVerifying(true);
    // TODO: replace with a real re-auth call, e.g.
    // useVerifyAdminPassword().mutateAsync(adminPassword), and call
    // setAdminPasswordError("Incorrect password.") on failure instead of
    // advancing the step.
    setTimeout(() => {
      setIsVerifying(false);
      setStep("method");
    }, 600);
  }

  function selectMethod(next: ResetPasswordMethod) {
    setMethod(next);
    setStep(next === "direct" ? "direct" : "link");
    if (next === "link" && !linkToken) {
      generateLink();
    }
  }

  function handleGeneratePassword() {
    const generated = passwordGenerator(user.name || "User");
    setDirectForm({ password: generated, confirmPassword: generated });
    setDirectErrors((e) => ({ ...e, password: undefined, confirmPassword: undefined }));
    requestAnimationFrame(() => directPasswordRef.current?.select());
  }

  function validateDirect(): Partial<Record<keyof DirectResetForm, string>> {
    const e: Partial<Record<keyof DirectResetForm, string>> = {};
    if (!directForm.password.trim()) e.password = "New password is required.";
    else if (directForm.password.length < 8) e.password = "Use at least 8 characters.";
    if (directForm.confirmPassword !== directForm.password)
      e.confirmPassword = "Passwords don't match.";
    return e;
  }

  function handleDirectSubmit() {
    const e = validateDirect();
    if (Object.keys(e).length > 0) {
      setDirectErrors(e);
      return;
    }
    setIsResetting(true);
    // TODO: replace with a real mutation, e.g.
    // useResetUserPassword().mutate({ userId: user.id, password: directForm.password })
    setTimeout(() => {
      setIsResetting(false);
      setResetComplete(true);
      toast.success(`Password reset for ${user.name}.`);
    }, 700);
  }

  function generateLink() {
    setIsGeneratingLink(true);
    // TODO: replace with a real mutation that issues a one-time reset
    // token server-side, e.g.
    // useCreatePasswordResetLink().mutateAsync({ userId: user.id })
    setTimeout(() => {
      const token = crypto.randomUUID();
      setLinkToken(token);
      setLinkExpiresAt(new Date(Date.now() + 15 * 60 * 1000));
      setIsGeneratingLink(false);
    }, 600);
  }

  const resetLinkUrl = linkToken
    ? `${window.location.origin}/reset-password/${linkToken}`
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

  function goBack() {
    if (step === "method") setStep("verify");
    else if (step === "direct" || step === "link") setStep("method");
  }

  function handleClose() {
    onClose();
  }

  return {
    user,
    step,
    goBack,
    handleClose,
    // verify
    adminPassword,
    setAdminPassword,
    adminPasswordError,
    setAdminPasswordError,
    showAdminPassword,
    setShowAdminPassword,
    isVerifying,
    handleVerifyPassword,
    // method
    method,
    selectMethod,
    // direct
    directForm,
    setDirectForm,
    directErrors,
    setDirectErrors,
    showDirectPassword,
    setShowDirectPassword,
    isResetting,
    resetComplete,
    directPasswordRef,
    handleGeneratePassword,
    handleDirectSubmit,
    // link
    linkToken,
    linkExpiresAt,
    isGeneratingLink,
    resetLinkUrl,
    generateLink,
    handleCopyLink,
  };
}

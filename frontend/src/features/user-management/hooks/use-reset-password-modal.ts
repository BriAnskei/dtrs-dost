import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "../../../lib/api-error";
import { authenticationService } from "../../authentication/service/authentication.service";
import { passwordResetService } from "../service/password-reset.service";
import { userService } from "../service/user.service";
import type { SystemUser } from "../type/user.type";
import { passwordGenerator } from "../utils/passwordGenerator";

export type ResetPasswordStep = "verify" | "method" | "direct" | "link";
export type ResetPasswordMethod = "direct" | "link";

interface DirectResetForm {
  password: string;
  confirmPassword: string;
}

export function useResetPasswordModal(user: SystemUser, onClose: () => void) {
  const [step, setStep] = useState<ResetPasswordStep>("verify");

  // ── Step 1: re-authenticate the acting admin ──────────────────────────
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState<string | undefined>();
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  const verifyPasswordMutation = useMutation({
    mutationFn: (password: string) => authenticationService.verifyPassword(password),
    onSuccess: () => setStep("method"),
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
  const [resetComplete, setResetComplete] = useState(false);
  const directPasswordRef = useRef<HTMLInputElement>(null);

  const directResetMutation = useMutation({
    mutationFn: (password: string) =>
      userService.updatePassword({ user_id: user.id, password }),
    onSuccess: () => {
      setResetComplete(true);
      toast.success(`Password reset for ${user.name}.`);
    },
    onError: (err) => {
      setDirectErrors((e) => ({
        ...e,
        password: getErrorMessage(err, "Could not reset the password."),
      }));
    },
  });

  // ── Step 3b: link / QR reset ───────────────────────────────────────────
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkExpiresAt, setLinkExpiresAt] = useState<Date | null>(null);

  const generateLinkMutation = useMutation({
    mutationFn: () => passwordResetService.createResetRequest(user.id),
    onSuccess: (data) => {
      setLinkToken(data.token);
      setLinkExpiresAt(new Date(data.expires_at));
    },
    onError: (err) =>
      toast.error(getErrorMessage(err, "Could not generate a reset link.")),
  });

  function generateLink() {
    setLinkToken(null);
    setLinkExpiresAt(null);
    generateLinkMutation.mutate();
  }

  function selectMethod(next: ResetPasswordMethod) {
    setMethod(next);
    setStep(next === "direct" ? "direct" : "link");
    if (next === "link") generateLink();
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
    directResetMutation.mutate(directForm.password);
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
    adminPassword,
    setAdminPassword,
    adminPasswordError,
    setAdminPasswordError,
    showAdminPassword,
    setShowAdminPassword,
    isVerifying: verifyPasswordMutation.isPending,
    handleVerifyPassword,
    method,
    selectMethod,
    directForm,
    setDirectForm,
    directErrors,
    setDirectErrors,
    showDirectPassword,
    setShowDirectPassword,
    isResetting: directResetMutation.isPending,
    resetComplete,
    directPasswordRef,
    handleGeneratePassword,
    handleDirectSubmit,
    linkToken,
    linkExpiresAt,
    isGeneratingLink: generateLinkMutation.isPending,
    resetLinkUrl,
    generateLink,
    handleCopyLink,
  };
}

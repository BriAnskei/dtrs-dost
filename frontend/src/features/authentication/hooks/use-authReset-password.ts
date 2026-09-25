import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "../../../lib/api-error";
import { authPasswordResetService } from "../service/authPassword-reset.service";

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

export function useResetPasswordFlow(token: string | undefined) {
  const verifyQuery = useQuery({
    queryKey: ["password-reset-verify", token],
    queryFn: () => authPasswordResetService.verifyToken(token as string),
    enabled: !!token,
    retry: false,
    staleTime: 0,
  });

  const expiresAt = useMemo(() => {
    const value = verifyQuery.data?.resetToken.expires_at;

    return value ? new Date(value) : null;
  }, [verifyQuery.data?.resetToken.expires_at]);

  const [remaining, setRemaining] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isExpiredClientSide, setIsExpiredClientSide] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const ms = expiresAt.getTime() - Date.now();
      if (ms <= 0) {
        setIsExpiredClientSide(true);
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, "0")}`);
      setIsUrgent(ms <= 2 * 60 * 1000);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [resetComplete, setResetComplete] = useState(false);

  const resetMutation = useMutation({
    mutationFn: () =>
      authPasswordResetService.resetPassword({
        token: token as string,
        new_password: password,
      }),
    onSuccess: () => {
      setResetComplete(true);
      toast.success("Your password has been changed.");
    },
    onError: (err) => {
      const message = getErrorMessage(err, "Could not reset your password.");
      if (axios.isAxiosError(err) && err.response?.status === 400) {
        // Token died between page-load verification and submit.
        setIsExpiredClientSide(true);
        toast.error(message);
        return;
      }
      setFormErrors((e) => ({ ...e, password: message }));
    },
  });

  function validate(): boolean {
    const errors: FormErrors = {};
    if (!password.trim()) errors.password = "New password is required.";
    else if (password.length < 8) errors.password = "Use at least 8 characters.";
    if (confirmPassword !== password) errors.confirmPassword = "Passwords don't match.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    resetMutation.mutate();
  }

  return {
    isVerifying: verifyQuery.isLoading,
    isTokenInvalid: verifyQuery.isError,
    tokenErrorMessage: verifyQuery.error
      ? getErrorMessage(verifyQuery.error, "This reset link is invalid.")
      : undefined,
    isExpired: isExpiredClientSide,
    remaining,
    isUrgent,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    formErrors,
    setFormErrors,
    isSubmitting: resetMutation.isPending,
    resetComplete,
    handleSubmit,
  };
}

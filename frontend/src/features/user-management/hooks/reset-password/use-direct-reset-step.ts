// hooks/steps/use-direct-reset-step.ts
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "../../../../lib/api-error";
import { userService } from "../../service/user.service";
import type { SystemUser } from "../../type/user.type";
import { passwordGenerator } from "../../utils/passwordGenerator";

interface DirectResetForm {
  password: string;
  confirmPassword: string;
}

export function useDirectResetStep(user: SystemUser) {
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
    onError: (err) =>
      setDirectErrors((e) => ({
        ...e,
        password: getErrorMessage(err, "Could not reset the password."),
      })),
  });

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

  return {
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
  };
}

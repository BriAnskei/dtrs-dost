import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCreateUser } from "../hooks/use-create-user";
import { useUpdateUser } from "../hooks/use-update-user";
import { passwordGenerator } from "../utils/passwordGenerator";
import {
  type AssignableRole,
  ROLE_ID_MAP,
  type UserFormState,
} from "../type/creater-user.type";

/**
 * Encapsulates all state and business logic for the user form modal.
 *
 * The companion `UserFormModal` component should call this hook and render
 * pure JSX — no `useState` / validation / mutation logic lives in the
 * component body.
 *
 * NOTE: "update user" mutations are wired here but the parent table still
 * gates the edit flow behind a stub — the real save endpoint is not wired yet.
 */
export function useUserFormModal(
  mode: "add" | "edit",
  initial: UserFormState,
  onClose: () => void,
  userId?: string,
) {
  const [form, setForm] = useState<UserFormState>(initial);
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormState, string>>
  >({});
  const [showPassword, setShowPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const isSubmitting = createUser.isPending || updateUser.isPending;

  function validate(): Partial<Record<keyof UserFormState, string>> {
    const e: Partial<Record<keyof UserFormState, string>> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.role) e.role = "Role is required.";
    if (form.role === "Division" && !form.division?.trim())
      e.division = "Division is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email.";
    if (mode === "add" && !form.password?.trim())
      e.password = "Password is required.";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    const payload = {
      full_name: form.name,
      email: form.email,
      role_id: String(ROLE_ID_MAP[form.role as AssignableRole]),
      division: form.role === "Division" ? (form.division as string) : undefined,
      position: form.position.trim() ? form.position : undefined,
      contact_number: form.contact.trim() ? form.contact : undefined,
    };

    if (mode === "add") {
      createUser.mutate(
        { ...payload, password: form.password as string },
        {
          onSuccess: () => {
            setCreatedUser({ email: form.email, password: form.password ?? "" });
          },
        },
      );
    } else if (userId) {
      updateUser.mutate({ id: userId, data: payload }, { onSuccess: onClose });
    }
  }

  function handleGeneratePassword() {
    const generated = passwordGenerator(form.name || "User");
    setForm((f) => ({ ...f, password: generated }));
    setErrors((er) => ({ ...er, password: undefined }));
    setShowPassword(true);
    requestAnimationFrame(() => passwordRef.current?.select());
  }

  async function handleCopyPassword() {
    if (!form.password) return;
    try {
      await navigator.clipboard.writeText(form.password);
      toast.success("Password copied to clipboard.");
    } catch {
      toast.error("Couldn't copy password.");
    }
  }

  return {
    form,
    setForm,
    errors,
    setErrors,
    showPassword,
    setShowPassword,
    createdUser,
    passwordRef,
    isSubmitting,
    handleSubmit,
    handleGeneratePassword,
    handleCopyPassword,
  };
}

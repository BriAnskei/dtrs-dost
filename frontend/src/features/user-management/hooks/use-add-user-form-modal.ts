import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCreateUser } from "../hooks/use-create-user";
import {
  type AssignableRole,
  ROLE_ID_MAP,
  type UserFormState,
} from "../type/creater-user.type";
import { passwordGenerator } from "../utils/passwordGenerator";

/**
 * State and business logic for the **Add User** modal only.
 *
 * Companion `AddUserModal` component calls this hook and renders JSX.
 * No mutation / validation logic lives in the component body.
 */
export function useAddUserFormModal(initial: UserFormState) {
  const [form, setForm] = useState<UserFormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormState, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [createdUser, setCreatedUser] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const createUser = useCreateUser();
  const isSubmitting = createUser.isPending;

  function validate(): Partial<Record<keyof UserFormState, string>> {
    const e: Partial<Record<keyof UserFormState, string>> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.role) e.role = "Role is required.";
    if (form.role === "Division" && !form.division?.trim())
      e.division = "Division is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email.";
    if (!form.password?.trim()) e.password = "Password is required.";
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

    createUser.mutate(
      { ...payload, password: form.password as string },
      {
        onSuccess: () => {
          setCreatedUser({ email: form.email, password: form.password ?? "" });
        },
      },
    );
  }

  function handleGeneratePassword() {
    const generated = passwordGenerator(form.name || "User");
    setForm((f) => ({ ...f, password: generated }));
    setErrors((er) => ({ ...er, password: undefined }));
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

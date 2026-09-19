import { useState } from "react";
import { useUpdateUser } from "../hooks/use-update-user";
import {
  type AssignableRole,
  ROLE_ID_MAP,
  type UserFormState,
} from "../type/creater-user.type";

/**
 * State and business logic for the **Edit User** modal only.
 *
 * Companion `EditUserModal` component calls this hook and renders JSX.
 * No mutation / validation logic lives in the component body.
 */
export function useEditUserFormModal(
  initial: UserFormState,
  onClose: () => void,
  userId: string,
) {
  const [form, setForm] = useState<UserFormState>(initial);
  const [errors, setErrors] = useState<
    Partial<Record<keyof UserFormState, string>>
  >({});

  const updateUser = useUpdateUser();
  const isSubmitting = updateUser.isPending;

  function validate(): Partial<Record<keyof UserFormState, string>> {
    const e: Partial<Record<keyof UserFormState, string>> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.role) e.role = "Role is required.";
    if (form.role === "Division" && !form.division?.trim())
      e.division = "Division is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email.";
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

    updateUser.mutate({ id: userId, data: payload }, { onSuccess: onClose });
  }

  return {
    form,
    setForm,
    errors,
    setErrors,
    isSubmitting,
    handleSubmit,
  };
}

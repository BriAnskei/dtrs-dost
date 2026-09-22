import { useState } from "react";
import {
  type AssignableRole,
  ROLE_ID_MAP,
  type UserFormState,
} from "../types/create-user.type";
import type { UpdateUserPayload } from "../types/update-user.type";
import { useUpdateUser } from "./use-update-user";

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
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormState, string>>>({});

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

  function buildChangedPayload(
    initial: UserFormState,
    form: UserFormState,
  ): Partial<UpdateUserPayload> {
    const payload: Partial<UpdateUserPayload> = {};

    if (form.name !== initial.name) {
      payload.full_name = form.name;
    }

    if (form.role !== initial.role) {
      payload.role_id = String(ROLE_ID_MAP[form.role as AssignableRole]);
    }

    if (form.role === "Division" && form.division !== initial.division) {
      payload.division = form.division;
    }

    if (form.position !== initial.position) {
      payload.position = form.position.trim() ? form.position : null;
    }

    if (form.email !== initial.email) {
      payload.email = form.email;
    }

    if (form.contact !== initial.contact) {
      payload.contact_number = form.contact.trim() ? form.contact : null;
    }

    return payload;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }

    const payload = buildChangedPayload(initial, form);

    if (Object.keys(payload).length === 0) {
      onClose(); // nothing changed, no need to hit the API
      return;
    }

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

import { useState } from "react";
import type { SystemUser } from "../../user-management/types/user.type";
import { useDeleteUser } from "./api/user-delete-user";

interface UseDeleteUserModalArgs {
  user: SystemUser;
  onClose: () => void;
}

export function useDeleteUserModal({ user, onClose }: UseDeleteUserModalArgs) {
  const [confirmText, setConfirmText] = useState("");
  const canConfirm = confirmText.trim() === user.name;

  const { mutate, isPending } = useDeleteUser();

  function handleSubmit() {
    if (!canConfirm || isPending) return;
    mutate(user.id, {
      onSuccess: () => onClose(),
    });
  }

  return {
    confirmText,
    setConfirmText,
    canConfirm,
    isDeleting: isPending,
    handleSubmit,
  };
}

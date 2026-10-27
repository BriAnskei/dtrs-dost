import type { SystemUser } from "../../user-management/types/user.type";
import { useReactivateUser } from "./api/use-reactivate-user";

export function useReactivateUserModal(user: SystemUser, onClose: () => void) {
  const reactivateUser = useReactivateUser();
  const isSubmitting = reactivateUser.isPending;

  function handleConfirm() {
    reactivateUser.mutate(user.id, {
      onSuccess: () => {
        onClose();
      },
    });
  }

  return {
    isSubmitting,
    handleConfirm,
  };
}

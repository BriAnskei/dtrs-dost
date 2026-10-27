import Modal from "../../../../components/Modal";
import type { SystemUser } from "../../../user-management/types/user.type";
import { useReactivateUserModal } from "../../hooks/use-reactivate-user-modal";

interface ReactivateUserModalProps {
  user: SystemUser;
  onClose: () => void;
}

export default function ReactivateUserModal({ user, onClose }: ReactivateUserModalProps) {
  const { isSubmitting, handleConfirm } = useReactivateUserModal(user, onClose);

  return (
    <Modal
      onClose={isSubmitting ? () => {} : onClose}
      size="sm"
      scrollable={false}
      body={
        <>
          <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Reactivate {user.name}?
          </h3>
          <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
            This will restore their access and move them back to the active user list.
          </p>
        </>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-theme-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Reactivating…" : "Reactivate"}
          </button>
        </>
      }
      onSubmit={handleConfirm}
    />
  );
}

import Input from "../../../../components/form/input/InputField";
import Modal from "../../../../components/Modal";
import type { SystemUser } from "../../../user-management/types/user.type";
import { useDeleteUserModal } from "../../hooks/use-delete-user-modal"; // adjust path

interface PermanentDeleteUserModalProps {
  user: SystemUser;
  onClose: () => void;
}

export default function PermanentDeleteUserModal({
  user,
  onClose,
}: PermanentDeleteUserModalProps) {
  const { confirmText, setConfirmText, canConfirm, isDeleting, handleSubmit } =
    useDeleteUserModal({ user, onClose });

  return (
    <Modal
      onClose={onClose}
      size="sm"
      scrollable={false}
      body={
        <>
          <h3 className="text-theme-sm font-semibold text-danger">
            Permanently delete {user.name}?
          </h3>
          <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
            This cannot be undone. Their account, role, and access history will be
            permanently removed.
          </p>

          <Input
            size="sm"
            className="mt-4"
            label={`Type "${user.name}" to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            disabled={isDeleting}
          />
        </>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-theme-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canConfirm || isDeleting}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-danger hover:bg-danger/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {isDeleting ? "Deleting..." : "Delete Permanently"}
          </button>
        </>
      }
      onSubmit={handleSubmit}
    />
  );
}

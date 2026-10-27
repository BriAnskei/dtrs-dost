import { Loader2, Trash2 } from "lucide-react";
import Modal from "../../../../components/Modal";
import type {
  ExtractedDocumentQueueStatus,
  MyExtractedDocumentQueue,
} from "../types/extracted-queue-receiver-types";

interface Props {
  item: MyExtractedDocumentQueue | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const COPY: Record<
  ExtractedDocumentQueueStatus,
  {
    title: string;
    message: string;
    note: string;
    action: string;
    pending: string;
    destructive: boolean;
  }
> = {
  PENDING: {
    title: "Delete this upload?",
    message:
      "This upload hasn't been reviewed yet. Deleting it removes it from the admin review queue.",
    note: "The uploaded PDF is permanently deleted too. This can't be undone.",
    action: "Delete",
    pending: "Deleting...",
    destructive: true,
  },
  INVALIDATED: {
    title: "Delete this upload?",
    message: "An admin invalidated this upload, so it has no incoming record.",
    note: "This permanently deletes the remaining records associated with this upload. This can't be undone.",
    action: "Delete",
    pending: "Deleting...",
    destructive: true,
  },
  APPROVED: {
    title: "Remove from my uploads?",
    message:
      "This upload was approved and is now an incoming document. Only this entry in your uploads will be removed.",
    note: "The incoming document and its PDF stay in the system and are not affected.",
    action: "Remove",
    pending: "Removing...",
    destructive: false,
  },
};

export default function DeleteQueueModal({
  item,
  isDeleting,
  onClose,
  onConfirm,
}: Props) {
  if (!item) return null;

  const copy = COPY[item.status];

  return (
    <Modal
      size="sm"
      scrollable={false}
      onClose={onClose}
      closeDisabled={isDeleting}
      onSubmit={onConfirm}
      header={
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          {copy.title}
        </h3>
      }
      body={
        <div className="space-y-3">
          <p
            className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90"
            title={item.file_name}
          >
            {item.file_name}
          </p>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">{copy.message}</p>
          <p
            className={`text-theme-sm ${
              copy.destructive
                ? "text-error-600 dark:text-error-400"
                : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {copy.note}
          </p>
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 text-gray-700 hover:border-gray-300 dark:border-white/8 dark:text-gray-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isDeleting}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-theme-sm rounded-lg text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              copy.destructive
                ? "bg-error-600 hover:bg-error-700"
                : "bg-gray-800 hover:bg-gray-900 dark:bg-white/10 dark:hover:bg-white/15"
            }`}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            {isDeleting ? copy.pending : copy.action}
          </button>
        </>
      }
    />
  );
}

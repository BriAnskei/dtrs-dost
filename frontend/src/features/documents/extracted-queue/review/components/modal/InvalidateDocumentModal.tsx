import Modal from "../../../../../../components/Modal";
import { useInvalidateDocumentModal } from "../../hooks/use-invalidate-document-modal";

type InvalidateDocumentModalProps = {
  id: string;
  fileName: string;
  onClose: () => void;
  onInvalidated: () => void;
};

export default function InvalidateDocumentModal({
  id,
  fileName,
  onClose,
  onInvalidated,
}: InvalidateDocumentModalProps) {
  const { response, setResponse, isSubmitting, handleSubmit } =
    useInvalidateDocumentModal({ id, onInvalidated });

  return (
    <Modal
      onClose={onClose}
      closeDisabled={isSubmitting}
      onSubmit={handleSubmit}
      header={
        <>
          <div className="min-w-0">
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              Invalidate Document
            </h2>
            <p
              title={fileName}
              className="mt-0.5 truncate text-theme-xs text-gray-400 dark:text-gray-500"
            >
              {fileName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </>
      }
      body={
        <div className="space-y-4">
          <p className="text-theme-sm text-gray-600 dark:text-gray-400">
            This document will be marked as invalid and removed from the extraction queue.
            This can&apos;t be undone.
          </p>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="invalidate-response"
              className="text-theme-xs font-medium text-gray-600 dark:text-gray-400"
            >
              Response{" "}
              <span className="font-normal text-gray-400 dark:text-gray-500">
                (optional)
              </span>
            </label>
            <textarea
              id="invalidate-response"
              rows={4}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. The scan is unreadable. Please re-upload a clearer copy."
              className="resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-theme-sm text-gray-700 transition focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/40 disabled:opacity-50 dark:border-white/8 dark:bg-white/5 dark:text-gray-200"
            />
            <p className="text-theme-xs text-gray-400 dark:text-gray-500">
              Shown to the uploader so they know why it was invalidated.
            </p>
          </div>
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border-white/8 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-error-600 hover:bg-error-600/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Invalidating…" : "Invalidate"}
          </button>
        </>
      }
    />
  );
}

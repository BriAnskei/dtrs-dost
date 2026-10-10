import Modal from "../../../../../components/Modal";
import type { MyExtractedDocumentQueue } from "../../types/extracted-queue-receiver-types";
import MyUploadedDocumentResultCard from "../MyUploadedDocumentResultCard";

interface Props {
  item: MyExtractedDocumentQueue;
  onClose: () => void;
}

export default function MyUploadedDocumentViewModal({ item, onClose }: Props) {
  return (
    <Modal
      onClose={onClose}
      size="lg"
      header={
        <>
          <div>
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              Document Result
            </h2>
            <p className="mt-0.5 text-theme-xs text-gray-400 dark:text-gray-500">
              Extraction result.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
      body={<MyUploadedDocumentResultCard item={item} />}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border-white/8 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          Close
        </button>
      }
    />
  );
}

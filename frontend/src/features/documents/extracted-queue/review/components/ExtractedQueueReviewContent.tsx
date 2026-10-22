import ReviewSplitView from "../../../extraction/admins/components/ReviewSplitView";
import { useExtractedQueueReview } from "../hooks/use-extracted-queue-review";
import BackToQueueLink from "./BackToQueueLink";
import ExtractedQueueReviewSkeleton from "./ExtractedQueueReviewSkeleton";
import InvalidateDocumentModal from "./modal/InvalidateDocumentModal";
import ReviewActionBar from "./ReviewActionBar";
import ReviewDocumentHeader from "./ReviewDocumentHeader";

const SPLIT_VIEW_HEIGHT = "40rem";

export default function ExtractedQueueReviewContent({ id }: { id: string }) {
  const {
    detail,
    file,
    outcome,
    isLoading,
    isError,
    edits,
    hasEdits,
    handleEdit,
    isInvalidateModalOpen,
    openSaveModal,
    openInvalidateModal,
    closeModal,
    handleInvalidated,
  } = useExtractedQueueReview(id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="shrink-0">
          <BackToQueueLink />
        </div>

        {!isLoading && detail && (
          <ReviewDocumentHeader
            fileName={detail.file_name}
            uploaderName={detail.uploader_name}
          />
        )}
      </div>

      {isLoading && <ExtractedQueueReviewSkeleton height={SPLIT_VIEW_HEIGHT} />}

      {isError && (
        <p role="alert" className="text-theme-sm text-danger">
          Could not load this document. It may have been removed.
        </p>
      )}

      {!isLoading && detail && outcome && file && (
        <>
          <ReviewSplitView
            file={file}
            outcome={outcome}
            edits={edits}
            onEdit={handleEdit}
            height={SPLIT_VIEW_HEIGHT}
          />

          <ReviewActionBar onSave={openSaveModal} onInvalidate={openInvalidateModal} />

          {hasEdits && (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              Edits are kept on this page only. Saving is not available yet.
            </p>
          )}

          {isInvalidateModalOpen && (
            <InvalidateDocumentModal
              id={id}
              fileName={detail.file_name}
              onClose={closeModal}
              onInvalidated={handleInvalidated}
            />
          )}

          {/* TODO: render SaveIncomingModal when `isSaveModalOpen` and
              `handleSaveConfirm` from the hook once it exists. */}
        </>
      )}
    </div>
  );
}

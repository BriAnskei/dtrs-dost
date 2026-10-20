import { useState } from "react";
import ReviewSplitView from "../../extraction/admins/components/ReviewSplitView";
import type { FieldKey } from "../../extraction/types/extraction-types";
import { useExtractedQueueDetail } from "../hooks/api/use-extracted-queue-detial";
import BackToQueueLink from "./BackToQueueLink";
import ExtractedQueueReviewSkeleton from "./ExtractedQueueReviewSkeleton";
import ReviewDocumentHeader from "./ReviewDocumentHeader";

const SPLIT_VIEW_HEIGHT = "40rem";

export default function ExtractedQueueReviewContent({ id }: { id: string }) {
  const { detail, file, outcome, isLoading, isError } = useExtractedQueueDetail(id);

  // Reviewer edits, keyed by field. A key is present only if the field was edited.
  // Kept in page state until saving is implemented.
  const [edits, setEdits] = useState<Partial<Record<FieldKey, string>>>({});

  /** string = set the edited value, null = revert the field to the extracted value. */
  const handleEdit = (field: FieldKey, value: string | null) =>
    setEdits((prev) => {
      const next = { ...prev };
      if (value === null) delete next[field];
      else next[field] = value;
      return next;
    });

  const hasEdits = Object.keys(edits).length > 0;

  return (
    <div className="space-y-4">
      <BackToQueueLink />

      {isLoading && <ExtractedQueueReviewSkeleton height={SPLIT_VIEW_HEIGHT} />}

      {isError && (
        <p role="alert" className="text-theme-sm text-danger">
          Could not load this document. It may have been removed.
        </p>
      )}

      {!isLoading && detail && outcome && file && (
        <>
          <ReviewDocumentHeader
            fileName={detail.file_name}
            uploaderName={detail.uploader_name}
          />

          <ReviewSplitView
            file={file}
            outcome={outcome}
            edits={edits}
            onEdit={handleEdit}
            height={SPLIT_VIEW_HEIGHT}
          />

          {hasEdits && (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              Edits are kept on this page only. Saving is not available yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}

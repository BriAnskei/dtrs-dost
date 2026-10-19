import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import ComponentCard from "../../../../components/common/ComponentCard";
import PageMeta from "../../../../components/common/PageMeta";
import ReviewSplitView from "../../extraction/admins/components/ReviewSplitView";
import type { FieldKey } from "../../extraction/types/extraction-types";
import { useExtractedQueueDetail } from "../hooks/api/use-extracted-queue-detial";

const BACK_PATH = "/extracted-queues";

function ReviewContent({ id }: { id: string }) {
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
      <Link
        to={BACK_PATH}
        className="inline-flex items-center gap-1.5 text-theme-sm text-gray-600 transition hover:text-secondary dark:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to queue
      </Link>

      {isLoading && (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          Loading document...
        </p>
      )}

      {isError && (
        <p role="alert" className="text-theme-sm text-danger">
          Could not load this document. It may have been removed.
        </p>
      )}

      {detail && outcome && file && (
        <>
          <div className="min-w-0">
            <h3 className="truncate text-theme-xl font-semibold text-gray-800 dark:text-white/90">
              {detail.file_name}
            </h3>
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              Uploaded by {detail.uploader_name ?? "Unknown uploader"}
            </p>
          </div>

          <ReviewSplitView
            file={file}
            outcome={outcome}
            edits={edits}
            onEdit={handleEdit}
            height="40rem"
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

export default function ExtractedQueueReviewPage() {
  const { id = "" } = useParams();

  return (
    <>
      <PageMeta
        title="Review Extraction | Document Tracking System"
        description="Check the extracted fields against the uploaded document."
      />
      <div className="space-y-6">
        <ComponentCard>
          {/* key resets the edits if the route param changes */}
          <ReviewContent key={id} id={id} />
        </ComponentCard>
      </div>
    </>
  );
}

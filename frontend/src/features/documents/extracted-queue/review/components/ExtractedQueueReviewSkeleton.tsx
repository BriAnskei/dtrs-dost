import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

// react-loading-skeleton reads these CSS variables, so Tailwind's dark: variant works.
const THEME =
  "[--base-color:#e5e7eb] [--highlight-color:#f3f4f6] dark:[--base-color:rgba(255,255,255,0.08)] dark:[--highlight-color:rgba(255,255,255,0.16)]";

/** Placeholder for the title + uploader line. */
export function ReviewDocumentHeaderSkeleton() {
  return (
    <div>
      <Skeleton height={28} width="45%" />
      <Skeleton height={16} width={160} />
    </div>
  );
}

/** Placeholder for the PDF pane (left) and extracted-fields pane (right). */
export function ReviewSplitViewSkeleton({ height = "40rem" }: { height?: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" style={{ height }}>
      {/* Document preview */}
      <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <Skeleton height={20} width={96} />
          <Skeleton height={20} width={64} />
        </div>
        <div className="min-h-0 flex-1">
          <Skeleton height="100%" borderRadius={8} containerClassName="block h-full" />
        </div>
      </div>

      {/* Extracted fields */}
      <div className="flex min-h-0 flex-col gap-5 overflow-hidden rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <Skeleton height={20} width={128} />
        {["subject", "document-from", "recipient", "date", "status", "summary"].map(
          (field) => (
            <div key={field}>
              <Skeleton height={14} width={112} />
              <Skeleton height={40} borderRadius={8} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export default function ExtractedQueueReviewSkeleton({
  height = "40rem",
}: {
  height?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`space-y-4 ${THEME}`}
    >
      <span className="sr-only">Loading document...</span>
      <ReviewDocumentHeaderSkeleton />
      <ReviewSplitViewSkeleton height={height} />
    </div>
  );
}

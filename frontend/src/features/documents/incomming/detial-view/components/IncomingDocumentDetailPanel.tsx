import { ArrowRight, GitBranch } from "lucide-react";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import FilePreview from "../../../../../components/FilePreview";
import DetailPanel, {
  DetailField,
  DetailFieldGrid,
  DetailSection,
} from "../../../../../components/master-detail/DetailPanel";
import StatusBadge, {
  INCOMING_STATUS_BADGE,
} from "../../../../../components/ui/badge/StatusBadge";
import { formatDisplayName } from "../../../../../utils/formant-display-name";
import type { IncomingDocumentRow } from "../../types/incoming-document-row.type";
import { useIncomingDocumentDetailPanel } from "../hooks/use-incoming-document-detials-panel";
import AssignDivisionModal from "./modal/AssignDivisionModal";

interface IncomingDocumentDetailPanelProps {
  /** The selected row, or `null` when nothing is selected (panel closed). */
  row: IncomingDocumentRow | null;
  onClose: () => void;
}

/* Translucent gray reads correctly on both light and dark surfaces. */
const SKELETON_BASE = "rgba(156, 163, 175, 0.25)";
const SKELETON_HIGHLIGHT = "rgba(156, 163, 175, 0.4)";

const retryButtonClass =
  "rounded text-theme-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40";

function AssignedDivisionsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading assigned divisions"
      className="space-y-2"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/8"
        >
          <Skeleton width={`${70 - i * 12}%`} height={14} />
          <Skeleton width={28} height={20} borderRadius={999} />
        </div>
      ))}
    </div>
  );
}

function FilePreviewSkeleton() {
  // Match FilePreview's rendered height so nothing shifts when it loads.
  return (
    <div role="status" aria-busy="true" aria-label="Loading document file">
      <Skeleton height={384} borderRadius={8} />
    </div>
  );
}

export default function IncomingDocumentDetailPanel({
  row,
  onClose,
}: IncomingDocumentDetailPanelProps) {
  const {
    doc,
    isOpen,
    file,
    divisions,
    onViewFullDetails,
    onCloseAssign,
    onAssignDivisions,
    isAssignOpen,
  } = useIncomingDocumentDetailPanel({ row, onClose });

  if (!doc) return null;

  return (
    <>
      <DetailPanel
        isOpen={isOpen}
        onClose={onClose}
        eyebrow="Document details"
        title={doc.trackingNo}
        footer={
          <>
            {/* One primary action, rightmost; the supporting action sits to its left. */}
            <button
              type="button"
              onClick={onAssignDivisions}
              className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 dark:border-white/8 dark:bg-white/3 dark:text-gray-200 dark:hover:bg-white/5 sm:flex-none"
            >
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              Assign Divisions
            </button>
            <button
              type="button"
              onClick={onViewFullDetails}
              className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-theme-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-2 dark:ring-offset-gray-900 sm:flex-none"
            >
              View Full Details
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        }
        body={
          <SkeletonTheme baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT}>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-theme-xs text-gray-500 dark:text-gray-400">
                    Uploaded by{" "}
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {!doc.uploaderName ? null : formatDisplayName(doc.uploaderName)}
                    </span>
                  </p>
                  <div className="shrink-0">
                    <StatusBadge config={INCOMING_STATUS_BADGE[doc.status]} />
                  </div>
                </div>

                <h3 className="text-xl font-semibold leading-snug text-gray-800 wrap-break-word dark:text-white/90">
                  {doc.subject}
                </h3>

                {doc.summary ? (
                  <p className="whitespace-pre-line text-theme-sm text-gray-500 dark:text-gray-400">
                    {doc.summary}
                  </p>
                ) : (
                  <p className="text-theme-sm italic text-gray-400 dark:text-gray-500">
                    No summary available.
                  </p>
                )}
              </div>

              <DetailFieldGrid>
                <DetailField label="Sender">{doc.documentFrom}</DetailField>
                <DetailField label="Recipient">{doc.recipient}</DetailField>
                <DetailField label="Date received">{doc.dateReceived}</DetailField>
                <DetailField label="Created at">{doc.dateUploaded}</DetailField>
              </DetailFieldGrid>

              <DetailSection title="Document file">
                {file.isLoading ? (
                  <FilePreviewSkeleton />
                ) : (
                  <FilePreview
                    blob={file.blob}
                    fileName={doc.fileName}
                    isLoading={false}
                    isError={file.isError}
                    onRetry={file.retry}
                  />
                )}
              </DetailSection>

              <DetailSection title="Assigned divisions">
                {divisions.isLoading ? (
                  <AssignedDivisionsSkeleton />
                ) : divisions.isError ? (
                  <div className="flex items-center justify-between gap-3 text-theme-sm text-gray-500 dark:text-gray-400">
                    <span>Couldn't load assigned divisions.</span>
                    <button
                      type="button"
                      onClick={divisions.retry}
                      className={retryButtonClass}
                    >
                      Retry
                    </button>
                  </div>
                ) : divisions.isEmpty ? (
                  <p className="text-theme-sm italic text-gray-400 dark:text-gray-500">
                    Not assigned to any division yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {divisions.items.map((division) => (
                      <li
                        key={division.division_id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/8"
                      >
                        <span className="min-w-0 truncate text-theme-sm text-gray-700 dark:text-gray-200">
                          {division.division_name}
                        </span>
                        <span
                          className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-600 dark:bg-white/5 dark:text-gray-300"
                          title={`${division.total_assignments} assignment(s)`}
                        >
                          {division.total_assignments}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailSection>
            </div>
          </SkeletonTheme>
        }
      />

      {isAssignOpen && <AssignDivisionModal doc={doc} onClose={onCloseAssign} />}
    </>
  );
}

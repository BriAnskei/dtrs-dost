import { ArrowRight, GitBranch } from "lucide-react";
import { useState } from "react";
import DetailPanel, {
  DetailField,
  DetailFieldGrid,
  DetailSection,
} from "../../../../components/DetailPanel";
import StatusBadge, {
  INCOMING_STATUS_BADGE,
} from "../../../../components/ui/badge/StatusBadge";
import { useIncomingDocumentFile } from "../hooks/api/use-incoming-document-file";
import type { IncomingDocumentRow } from "../types/incoming-document-row.type";
import FilePreview from "./FilePreview";

interface IncomingDocumentDetailPanelProps {
  /** The selected row, or `null` when nothing is selected (panel closed). */
  row: IncomingDocumentRow | null;
  onClose: () => void;
}

export default function IncomingDocumentDetailPanel({
  row,
  onClose,
}: IncomingDocumentDetailPanelProps) {
  // Remember the last selected row so the content doesn't blank out
  // while the panel is sliding closed.
  const [lastRow, setLastRow] = useState(row);
  if (row && row !== lastRow) setLastRow(row);

  const doc = row ?? lastRow;
  const isOpen = row !== null;

  // Only fetch the file once the panel is actually open.
  const file = useIncomingDocumentFile({ id: doc?.id, enabled: isOpen });

  if (!doc) return null;

  const handleAssignDivisions = () => {
    // TODO: open the Assign Divisions flow for `doc` (e.g. DivisionMultiSelect modal).
    // Keep this panel open behind it so the user can confirm what they're assigning.
  };

  const handleViewFullDetails = () => {
    // TODO: navigate to the full incoming-document page for `doc.id`,
    // then close this panel (onClose) so it doesn't linger after navigation.
  };

  return (
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
            onClick={handleAssignDivisions}
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 dark:border-white/8 dark:bg-white/3 dark:text-gray-200 dark:hover:bg-white/5 sm:flex-none"
          >
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            Assign Divisions
          </button>
          <button
            type="button"
            onClick={handleViewFullDetails}
            className="inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-theme-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-2 dark:ring-offset-gray-900 sm:flex-none"
          >
            View Full Details
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      }
      body={
        <div className="space-y-6">
          <div className="space-y-3">
            <StatusBadge config={INCOMING_STATUS_BADGE[doc.status]} />
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
            <DetailField label="Sender" full>
              {doc.documentFrom}
            </DetailField>
            <DetailField label="Recipient">{doc.recipient}</DetailField>
            <DetailField label="Date received">{doc.dateReceived}</DetailField>
            <DetailField label="Uploaded by">{doc.uploaderName}</DetailField>
            <DetailField label="Created at">{doc.dateUploaded}</DetailField>
          </DetailFieldGrid>

          <DetailSection title="Document file">
            <FilePreview
              blob={file.data}
              fileName={doc.fileName}
              isLoading={file.isLoading}
              isError={file.isError}
              onRetry={() => file.refetch()}
            />
          </DetailSection>
        </div>
      }
    />
  );
}

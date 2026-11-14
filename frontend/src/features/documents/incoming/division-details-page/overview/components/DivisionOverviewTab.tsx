import {
  DetailField,
  DetailFieldGrid,
} from "../../../../../../components/master-detail/DetailPanel";
import { formatDate, formatDateTime } from "../../../../../../utils/dateFormatter";
import DetailsCard from "../../../detials-page/overview/component/DetialsCard";
import DocumentFilePreview, {
  type DocumentFileState,
} from "../../../detials-page/overview/component/DocumentFilePreview";
import type { RoutedIncomingDocumentDetailsDto } from "../../../types/get-division-incoming-document-details";
import DivisionProgressCard, {
  type DivisionAssignmentProgress,
} from "./DivisionProgressCard";
import DivisionActivityCard from "./DivisonActivityCard";

interface DivisionOverviewTabProps {
  doc: RoutedIncomingDocumentDetailsDto;
  progress: DivisionAssignmentProgress;
  file: DocumentFileState;
}

const EMPTY = "—";

export default function DivisionOverviewTab({
  doc,
  progress,
  file,
}: DivisionOverviewTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <DetailsCard eyebrow="Overview" title="Document overview">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-w-0 space-y-6">
              <div className="space-y-2">
                <h3 className="text-theme-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Summary
                </h3>
                {doc.summary ? (
                  <p className="whitespace-pre-line text-theme-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {doc.summary}
                  </p>
                ) : (
                  <p className="text-theme-sm italic text-gray-500 dark:text-gray-400">
                    No summary available.
                  </p>
                )}
              </div>

              <DetailFieldGrid>
                <DetailField label="Sender">{doc.sender || EMPTY}</DetailField>
                <DetailField label="Recipient">{doc.recipient || EMPTY}</DetailField>
                <DetailField label="Date received">
                  {doc.dateReceived ? formatDate(doc.dateReceived) : EMPTY}
                </DetailField>
                <DetailField label="Created at">
                  {doc.createdAt ? formatDateTime(doc.createdAt) : EMPTY}
                </DetailField>
              </DetailFieldGrid>
            </div>

            {/* The DTO has no file name, so the preview gets a generic one. */}
            <DocumentFilePreview file={file} fileName={doc.code ?? "document.pdf"} />
          </div>
        </DetailsCard>
      </div>

      <div className="space-y-6">
        <DivisionProgressCard progress={progress} />
        <DivisionActivityCard
          totalAssignments={progress.total}
          updatedAt={doc.updatedAt}
        />
      </div>
    </div>
  );
}

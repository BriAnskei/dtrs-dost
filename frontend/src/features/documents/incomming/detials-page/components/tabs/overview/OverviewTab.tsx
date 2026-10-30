import { formatDate } from "@fullcalendar/core/index.js";
import {
  DetailField,
  DetailFieldGrid,
} from "../../../../../../../components/master-detail/DetailPanel";
import { formatDateTime } from "../../../../../../../utils/dateFormatter";
import type { IncomingDocumentDetails } from "../../../../types/incoming-document-details.type";
import DetailsCard from "../../DetialsCard";
import DocumentFilePreview, { type DocumentFileState } from "../../DocumentFilePreview";
import ActionProgressCard, { type ActionProgress } from "./ActionProgressCard";
import RoutingActivityCard from "./RoutingActivityCard";

interface OverviewTabProps {
  doc: IncomingDocumentDetails;
  progress: ActionProgress;
  file: DocumentFileState;
}

export default function OverviewTab({ doc, progress, file }: OverviewTabProps) {
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
                <DetailField label="Sender">{doc.document_from}</DetailField>
                <DetailField label="Recipient">{doc.recipient}</DetailField>
                <DetailField label="Date received">
                  {doc.date_received ? formatDate(doc.date_received) : "—"}
                </DetailField>
                <DetailField label="Created at">
                  {formatDateTime(doc.created_at)}
                </DetailField>
              </DetailFieldGrid>
            </div>

            <DocumentFilePreview file={file} fileName={doc.file_name} />
          </div>
        </DetailsCard>
      </div>

      <div className="space-y-6">
        <ActionProgressCard progress={progress} />
        <RoutingActivityCard doc={doc} />
      </div>
    </div>
  );
}

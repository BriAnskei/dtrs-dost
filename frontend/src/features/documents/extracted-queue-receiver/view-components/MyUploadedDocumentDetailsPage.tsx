import { ArrowLeft, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import ComponentCard from "../../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import PageMeta from "../../../../components/common/PageMeta";
import Badge from "../../../../components/ui/badge/Badge";
import { formatDateTime } from "../../../../utils/dateFormatter";
import { useGetIncomingDocumentByQueue } from "../hooks/api/use-get-incoming-document-by-queue";
import { useMyQueueItem } from "../hooks/use-my-queue-item";
import { canDeleteQueueItem, capitalize, getStatusBadgeColor } from "../my-queue-helpers";
import type { ExtractedDocumentQueueStatus } from "../types/extracted-queue-receiver-types";
import MyUploadedDocumentDisclosure from "./MyUploadedDocumentDisclosure";
import MyUploadedDocumentOutcome from "./MyUploadedDocumentOutcome";
import MyUploadedDocumentResultCard from "./MyUploadedDocumentResultCard";

const LIST_PATH = "/my-uploads";

const STATUS_SUMMARY: Record<ExtractedDocumentQueueStatus, string> = {
  PENDING: "Waiting for an admin to review this document.",
  APPROVED:
    "Approved by an admin. The incoming document below is the final record. Open “AI extraction” on any field to see what was originally read.",
  INVALIDATED: "Invalidated by an admin.",
};

export default function MyUploadedDocumentDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const item = useMyQueueItem(id);

  // PENDING queues have nothing to fetch (the backend returns null for them).
  const needsDetails = !!item && item.status !== "PENDING";
  const details = useGetIncomingDocumentByQueue(id, needsDetails);

  // TODO: implement delete. Add a confirmation modal, a delete mutation that
  // invalidates ["my-extracted-document-queues"], and navigate back to LIST_PATH
  // on success. Keep the canDeleteQueueItem guard (the backend must enforce it too).
  function handleDelete() {
    // intentionally empty until the delete flow is implemented
  }

  const backButton = (
    <button
      type="button"
      onClick={() => navigate(LIST_PATH)}
      className="inline-flex items-center gap-1.5 text-theme-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white/90 transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to My Uploads
    </button>
  );

  if (!item) {
    return (
      <>
        <PageMeta
          title="Uploaded Document | Document Tracking System"
          description="Result of a document you uploaded."
        />
        <PageBreadcrumb pageTitle="Uploaded Document" />
        <ComponentCard>
          <div className="space-y-4">
            {backButton}
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              This document could not be found. Open it again from your uploads list.
            </p>
          </div>
        </ComponentCard>
      </>
    );
  }

  const deletable = canDeleteQueueItem(item);

  return (
    <>
      <PageMeta
        title="Uploaded Document | Document Tracking System"
        description="Track the decision and admin response for a document you uploaded."
      />
      <PageBreadcrumb pageTitle="Uploaded Document" />

      <div className="space-y-6">
        <ComponentCard>
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {backButton}
              <button
                type="button"
                onClick={handleDelete}
                disabled={!deletable}
                title={
                  deletable
                    ? "Delete this document"
                    : "Only invalid or invalidated documents can be deleted."
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 text-theme-sm rounded-lg border border-gray-200 text-error-600 hover:border-error-500/40 dark:border-white/8 dark:text-error-400 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>

            {/* One status only: the queue status. Everything else is plain text. */}
            <div className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2
                    className="truncate text-base font-semibold text-gray-800 dark:text-white/90"
                    title={item.file_name}
                  >
                    {item.file_name}
                  </h2>
                  <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                    Uploaded {formatDateTime(item.created_at)}
                  </p>
                </div>
                <Badge size="sm" color={getStatusBadgeColor(item.status)}>
                  {capitalize(item.status)}
                </Badge>
              </div>
              <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                {STATUS_SUMMARY[item.status]}
              </p>
            </div>

            <MyUploadedDocumentOutcome
              item={item}
              data={details.data}
              isLoading={details.isLoading}
              isError={details.isError}
              error={details.error}
            />

            {/* PENDING: nothing final exists yet, so the AI extraction is the main content. */}
            {item.status === "PENDING" && (
              <MyUploadedDocumentResultCard item={item} header="decision" />
            )}

            {/* INVALIDATED: there is no incoming record to attach the values to. */}
            {item.status === "INVALIDATED" && (
              <MyUploadedDocumentDisclosure
                title="Advanced details"
                description="AI extraction results"
              >
                <div className="space-y-3">
                  <div>
                    <h4 className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      AI extraction
                    </h4>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                      What the AI read from your upload before the admin invalidated it.
                    </p>
                  </div>
                  <MyUploadedDocumentResultCard item={item} header="none" />
                </div>
              </MyUploadedDocumentDisclosure>
            )}
          </div>
        </ComponentCard>
      </div>
    </>
  );
}

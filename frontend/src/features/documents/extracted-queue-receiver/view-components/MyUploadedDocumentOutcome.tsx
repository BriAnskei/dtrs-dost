import type { ReactNode } from "react";
import { formatDateTime } from "../../../../utils/dateFormatter";
import { capitalize } from "../my-queue-helpers";
import type { MyExtractedDocumentQueue } from "../types/extracted-queue-receiver-types";
import type {
  IncomingDocumentDetailsDto,
  ReceiverQueueDetailsDto,
} from "../types/get-incoming-document-by-queue.dto";
import MyUploadedIncomingFields from "./MyUploadedIncomningFields";
import {
  isIncomingDocumentDetails,
  isInvalidationResponse,
} from "./utils/queue-details-guards";

interface Props {
  item: MyExtractedDocumentQueue;
  data: ReceiverQueueDetailsDto | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

const PANEL_CLASS =
  "rounded-xl border border-gray-200 bg-white p-4 dark:border-white/8 dark:bg-white/3";

/** Text color only (no badge) for the incoming document's tracking status. */
const TRACKING_TEXT_CLASS: Record<IncomingDocumentDetailsDto["status"], string> = {
  pending: "text-warning-700 dark:text-warning-400",
  ongoing: "text-sky-600 dark:text-sky-400",
  complete: "text-success-700 dark:text-success-400",
};

function Panel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={PANEL_CLASS}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Notice({ tone, children }: { tone: "muted" | "error"; children: ReactNode }) {
  const toneClass =
    tone === "error"
      ? "border-error-200 text-error-600 dark:border-error-500/30 dark:text-error-400"
      : "border-gray-200 text-gray-500 dark:border-white/8 dark:text-gray-400";
  return (
    <div
      className={`rounded-xl border bg-white p-4 text-theme-sm dark:bg-white/3 ${toneClass}`}
    >
      {children}
    </div>
  );
}

/**
 * The primary answer for the receiver once an admin has acted:
 * APPROVED    -> the final incoming document (tracking status, dates, and per-field AI extraction)
 * INVALIDATED -> the (optional) reason from the admin
 * PENDING     -> nothing here; the page shows the extraction result instead
 */
export default function MyUploadedDocumentOutcome({
  item,
  data,
  isLoading,
  isError,
  error,
}: Props) {
  if (item.status === "PENDING") return null;

  if (isLoading) {
    return (
      <div className={`${PANEL_CLASS} animate-pulse space-y-3`} aria-busy="true">
        <div className="h-4 w-40 rounded bg-gray-100 dark:bg-white/8" />
        <div className="h-3 w-full rounded bg-gray-100 dark:bg-white/8" />
        <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-white/8" />
      </div>
    );
  }

  if (isError) {
    return (
      <Notice tone="error">
        {error instanceof Error ? error.message : "Failed to load the admin result."}
      </Notice>
    );
  }

  if (item.status === "APPROVED") {
    if (!isIncomingDocumentDetails(data)) {
      return (
        <Notice tone="muted">
          This document was approved, but its incoming record is not available yet.
        </Notice>
      );
    }

    return (
      <Panel
        title="Incoming document"
        aside={
          <p className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">
            Tracking:{" "}
            <span className={`font-semibold ${TRACKING_TEXT_CLASS[data.status]}`}>
              {capitalize(data.status)}
            </span>
          </p>
        }
      >
        <MyUploadedIncomingFields data={data} item={item} />

        {/* The incoming record is created at approval, so created_at is the approval time. */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-gray-100 pt-3 text-theme-xs text-gray-400 dark:border-white/5 dark:text-gray-500">
          <span>Approved at {formatDateTime(data.created_at)}</span>
          <span>Last updated {formatDateTime(data.updated_at)}</span>
        </div>
      </Panel>
    );
  }

  // INVALIDATED: the admin's reason is optional.
  if (!isInvalidationResponse(data)) {
    return (
      <Notice tone="muted">
        The admin did not leave a reason for invalidating this document.
      </Notice>
    );
  }

  return (
    <Panel title="Reason from admin">
      <p className="whitespace-pre-wrap break-words text-theme-sm text-gray-800 dark:text-white/90">
        {data.response}
      </p>
      <p className="mt-2 text-theme-xs text-gray-400 dark:text-gray-500">
        {formatDateTime(data.created_at)}
      </p>
    </Panel>
  );
}

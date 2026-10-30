import { useCallback } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useAssignedDivisionNoticeCounts } from "../../shared-api-hooks/use-assigned-division-notice-count";
import { useIncomingDocumentFile } from "../../shared-api-hooks/use-incoming-document-file";
import type { DivisionNoticeOfAction } from "../../types/assign-incoming-document-to-dto-division.type";
import { useIncomingDocumentDetails } from "./api/use-incoming-document-detials";

export const DETAIL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "routed-divisions", label: "Routed Divisions" },
  { id: "ongoing-actions", label: "Ongoing Actions" },
  { id: "action-history", label: "Action History" },
  { id: "status-history", label: "Status History" },
] as const;

export type DetailTabId = (typeof DETAIL_TABS)[number]["id"];

const DEFAULT_TAB: DetailTabId = "overview";

const isTabId = (value: string | null): value is DetailTabId =>
  DETAIL_TABS.some((tab) => tab.id === value);

export function useIncomingDocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Unknown or missing ?tab= values fall back to Overview.
  const rawTab = searchParams.get("tab");
  const tab: DetailTabId = isTabId(rawTab) ? rawTab : DEFAULT_TAB;

  const setTab = useCallback(
    (next: DetailTabId) =>
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("tab", next);
        return params;
      }),
    [setSearchParams],
  );

  const detailsQuery = useIncomingDocumentDetails(id ?? "");
  const doc = detailsQuery.data;

  // The PDF is only shown on Overview. The 5-minute cache means switching
  // back to it doesn't refetch.
  const fileQuery = useIncomingDocumentFile({
    id,
    enabled: tab === "overview",
  });

  // Only fetched while the Routed Divisions tab is open. The assign mutation
  // invalidates this query, so the list refreshes after routing.
  const divisionsQuery = useAssignedDivisionNoticeCounts(id, tab === "routed-divisions");

  const progress = {
    inProgress: doc?.in_progress_assignment_count ?? 0,
    actionTaken: doc?.action_taken_count ?? 0,
  };

  const onAddAssignments = useCallback(
    async (_routingId: string, _notices: DivisionNoticeOfAction[]): Promise<boolean> => {
      // TODO: call the add-assignments endpoint once the backend supports it,
      // e.g. POST /incoming-documents/:routingId/assignments with `_notices`.
      // On success, invalidate:
      //   ["incoming-document-assignments", routingId]   (the panel's list)
      //   ["assigned-division-notice-counts", id]        (table + summary tiles)
      //   the document details query                     (overview progress)
      // and return true. Returning false keeps the panel's form open.
      toast.info("Adding notices of action isn't available yet.");
      return false;
    },
    [],
  );

  const onRemoveAssignment = useCallback(
    async (_routingId: string, _assignmentId: string): Promise<boolean> => {
      // TODO: call the remove-assignment endpoint once the backend supports it,
      // e.g. DELETE /incoming-documents/:routingId/assignments/:assignmentId.
      // Invalidate the same three queries as onAddAssignments, then return true.
      // Returning false restores the row in the panel.
      // The backend should decide whether assignments with an action taken
      // can be deleted; the panel already asks for confirmation for those.
      toast.info("Removing notices of action isn't available yet.");
      return false;
    },
    [],
  );

  return {
    tab,
    setTab,
    doc,
    trackingNo: doc ? (doc.code ?? doc.tracking_sequence) : undefined,
    isLoading: detailsQuery.isLoading,
    isError: detailsQuery.isError,
    retry: () => detailsQuery.refetch(),
    progress,
    file: {
      blob: fileQuery.data,
      isLoading: fileQuery.isLoading,
      isError: fileQuery.isError,
      retry: () => fileQuery.refetch(),
    },
    divisions: {
      data: divisionsQuery.data,
      isLoading: divisionsQuery.isLoading,
      isError: divisionsQuery.isError,
      retry: () => divisionsQuery.refetch(),
    },
    onAddAssignments,
    onRemoveAssignment,
  };
}

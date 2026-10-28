import { useCallback } from "react";
import { useParams, useSearchParams } from "react-router";
import { useIncomingDocumentFile } from "../../hooks/use-incoming-document-file";
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

  const progress = {
    inProgress: doc?.in_progress_assignment_count ?? 0,
    actionTaken: doc?.action_taken_count ?? 0,
  };

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
  };
}

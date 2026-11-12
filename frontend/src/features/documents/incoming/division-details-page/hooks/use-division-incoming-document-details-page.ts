import { FileText, History, ListChecks, type LucideIcon } from "lucide-react";
import { useCallback } from "react";
import { useParams, useSearchParams } from "react-router";
import { useUser } from "../../../../../context/currentUser/use-user";
import { useIncomingDocumentFile } from "../../shared/hooks/api/use-incoming-document-file";
import type { DivisionAssignmentProgress } from "../overview/DivisionProgressCard";
import { useDivisionIncomingDocumentDetails } from "./api/use-division-incoming-document-details";

export const DIVISION_DETAIL_TABS = [
  { id: "overview", label: "Overview", icon: FileText },
  { id: "assignments", label: "Assignments", icon: ListChecks },
  { id: "status-history", label: "Status History", icon: History },
] as const satisfies readonly {
  id: string;
  label: string;
  icon: LucideIcon;
}[];

export type DivisionDetailTabId = (typeof DIVISION_DETAIL_TABS)[number]["id"];

const DEFAULT_TAB: DivisionDetailTabId = "overview";

const isTabId = (value: string | null): value is DivisionDetailTabId =>
  DIVISION_DETAIL_TABS.some((tab) => tab.id === value);

// The API returns counts as strings.
const toCount = (value: string | undefined): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function useDivisionIncomingDocumentDetailsPage() {
  const { currentUser } = useUser();
  const { incomingDocumentId = "" } = useParams<{
    incomingDocumentId: string;
  }>();

  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab");
  const tab: DivisionDetailTabId = isTabId(rawTab) ? rawTab : DEFAULT_TAB;

  const setTab = useCallback(
    (next: DivisionDetailTabId) =>
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("tab", next);
          return params;
        },
        { replace: true }, // Back button leaves the page instead of cycling tabs
      ),
    [setSearchParams],
  );

  const detailsQuery = useDivisionIncomingDocumentDetails({
    incomingDocumentId,
  });
  const doc = detailsQuery.data;

  // The PDF is only shown on Overview, and only once the details loaded.
  const fileQuery = useIncomingDocumentFile({
    id: incomingDocumentId || undefined,
    enabled: tab === "overview" && Boolean(doc),
  });

  const progress: DivisionAssignmentProgress = {
    total: toCount(doc?.routingAssignmentCounts.total),
    ongoing: toCount(doc?.routingAssignmentCounts.ongoing),
    complete: toCount(doc?.routingAssignmentCounts.complete),
  };

  return {
    tab,
    setTab,
    doc,
    trackingNo: doc?.code ?? undefined,
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

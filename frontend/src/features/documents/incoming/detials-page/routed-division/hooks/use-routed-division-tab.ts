import { useRef, useState } from "react";
import { useAssignedDivisionNoticeCounts } from "../../../shared/hooks/api/use-assigned-division-notice-count";
import type { AssignedDivisionNoticeCount } from "../../../types/assigned-division-notice-count-response";
import type { IncomingDocumentDetails } from "../../../types/incoming-document-details.type";

export const COMPLETE_HINT = "This document is complete, so nothing new can be assigned.";

export function useRoutedDivisionTab(doc: IncomingDocumentDetails) {
  // The tab is only mounted while "routed-divisions" is active, so the query
  // can always be enabled here. The assign mutation invalidates this query,
  // so the list refreshes after routing.
  const query = useAssignedDivisionNoticeCounts(doc.id, true);

  const [routing, setRouting] = useState(false);
  const [detailTarget, setDetailTarget] = useState<AssignedDivisionNoticeCount | null>(
    null,
  );

  // TableShell requires scroll refs for infinite scroll; this list is a single
  // unpaginated response, so they are never observed.
  const tableRefs = {
    mobileScrollRef: useRef<HTMLDivElement>(null),
    mobileSentinelRef: useRef<HTMLDivElement>(null),
    desktopScrollRef: useRef<HTMLDivElement>(null),
    desktopSentinelRef: useRef<HTMLDivElement>(null),
  };

  const isComplete = doc.status === "complete";
  const list = query.data ?? [];
  const totalAssignments = list.reduce((sum, d) => sum + d.total_assignments, 0);
  const totalTaken = list.reduce((sum, d) => sum + d.action_taken_count, 0);

  return {
    // data
    list,
    hasDivisions: list.length > 0,
    isLoading: query.isLoading,
    isError: query.isError,
    retry: () => query.refetch(),

    // summary stats
    stats: {
      routedDivisions: list.length,
      totalAssignments,
      pendingActions: Math.max(0, totalAssignments - totalTaken),
    },

    // document state
    isComplete,
    completeHint: COMPLETE_HINT,

    // route-to-division modal
    routing,
    openRouting: () => setRouting(true),
    closeRouting: () => setRouting(false),
    routeModalDoc: {
      id: doc.id,
      trackingNo: doc.code ?? doc.tracking_sequence,
      subject: doc.subject,
    },

    // details panel
    detailTarget,
    openDetails: (row: AssignedDivisionNoticeCount) => setDetailTarget(row),
    closeDetails: () => setDetailTarget(null),

    tableRefs,
  };
}

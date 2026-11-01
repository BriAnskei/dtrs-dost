import { useCallback, useMemo, useState } from "react";
import type { AssignmentStatus } from "../../../types/assignment-types";
import type {
  AssignmentSort,
  IncomingDocumentAssignment,
} from "../types/incoming-document-assignment";
import { useIncomingDocumentAssignments } from "./api/use-incoming-document-assignments";

export type StatusFilter = "ALL" | AssignmentStatus;

export const ALL_OFFICES = "ALL";
export const MAIN_OFFICE = "MAIN";
const DIVISION_PREFIX = "DIVISION:";

export const STATUS_FILTERS: readonly { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "ONGOING", label: "Ongoing" },
  { id: "COMPLETE", label: "Completed" },
];

export interface OfficeOption {
  value: string;
  label: string;
}

/** Display name of the office an assignment belongs to. */
export const officeLabel = (a: IncomingDocumentAssignment) =>
  a.office_type === "MAIN" ? "Main office" : (a.division_name ?? "Unknown division");

const officeValue = (a: IncomingDocumentAssignment) =>
  a.office_type === "MAIN" ? MAIN_OFFICE : `${DIVISION_PREFIX}${a.division_name ?? ""}`;

const matchesSearch = (a: IncomingDocumentAssignment, needle: string) =>
  [
    a.notice_of_action,
    a.notice_description,
    officeLabel(a),
    a.assigned_by?.full_name,
    a.action_taken,
    a.action_taken_by?.full_name,
  ].some((field) => field?.toLowerCase().includes(needle));

/**
 * State and derived data for the Action Assignments tab.
 *
 * The list is fetched once per document (no server params, cached 5 min) and
 * filtered in memory. One document has a small, bounded set of assignments, so
 * this gives instant filtering and lets the status chips show live counts,
 * which server-side filtering can't do.
 */
export function useActionAssignmentsTab(incomingDocumentId: string) {
  const query = useIncomingDocumentAssignments(incomingDocumentId);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [office, setOffice] = useState<string>(ALL_OFFICES);
  const [sort, setSort] = useState<AssignmentSort>("newest");

  const items = useMemo(() => query.data ?? [], [query.data]);

  // Office dropdown is built from the data: Main office (if any) + each division.
  const officeOptions = useMemo<OfficeOption[]>(() => {
    const divisions = new Map<string, string>();
    let hasMain = false;
    for (const a of items) {
      if (a.office_type === "MAIN") hasMain = true;
      else divisions.set(officeValue(a), officeLabel(a));
    }
    return [
      { value: ALL_OFFICES, label: "All offices" },
      ...(hasMain ? [{ value: MAIN_OFFICE, label: "Main office" }] : []),
      ...[...divisions]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    ];
  }, [items]);

  // Everything except the status filter, so the chip counts answer
  // "how many would I see if I picked this status?".
  const scoped = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter(
      (a) =>
        (office === ALL_OFFICES || officeValue(a) === office) &&
        (!needle || matchesSearch(a, needle)),
    );
  }, [items, office, search]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      ALL: scoped.length,
      PENDING: 0,
      ONGOING: 0,
      COMPLETE: 0,
    };
    for (const a of scoped) c[a.status] += 1;
    return c;
  }, [scoped]);

  const visible = useMemo(() => {
    const rows = status === "ALL" ? scoped : scoped.filter((a) => a.status === status);
    const dir = sort === "newest" ? -1 : 1;
    return [...rows].sort(
      (a, b) =>
        dir * (Date.parse(a.created_at) - Date.parse(b.created_at)) ||
        a.id.localeCompare(b.id),
    );
  }, [scoped, status, sort]);

  const hasActiveFilters =
    search.trim() !== "" || status !== "ALL" || office !== ALL_OFFICES;

  const clearFilters = useCallback(() => {
    setSearch("");
    setStatus("ALL");
    setOffice(ALL_OFFICES);
  }, []);

  const toggleSort = useCallback(
    () => setSort((s) => (s === "newest" ? "oldest" : "newest")),
    [],
  );

  return {
    query,
    total: items.length,
    visible,
    counts,
    officeOptions,
    search,
    setSearch,
    status,
    setStatus,
    office,
    setOffice,
    sort,
    toggleSort,
    hasActiveFilters,
    clearFilters,
  };
}

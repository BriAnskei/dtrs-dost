import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { THIN_SCROLLBAR } from "../../../contant/ThinScrollBar";
import { MOCK_DIVISIONS } from "../data/mock-divisions";
import type { Division, DivisionResponse } from "../type/division.type";
import { mapDivisionsResponseToDivisions } from "../util/mapDivisionsResponseToDivisions";
import DivisionUsersModal from "./DivisionUsersModal";
import DivisionMobileCard from "./DivisionMobileCard";
import EditableDivisionName from "./EditableDivisionName";
import UserAvatarStack from "./UserAvatarStack";

const DIVISION_TABLE_COLUMNS = [
  { label: "Division Name", width: "w-40" },
  { label: "Users", width: "w-40" },
  { label: "Total", width: "w-16" },
  { label: "Action", width: "w-6" },
] as const;

interface DivisionManagementTableProps {
  maxTableHeight?: string;
  maxMobileHeight?: string;
}

export default function DivisionManagementTable({
  maxTableHeight = "560px",
  maxMobileHeight = "520px",
}: DivisionManagementTableProps = {}) {
  // ── Mock data as local state ──────────────────────────────────
  // Swap this block for `const { data, isLoading, isError, error } =
  // useDivisions();` (React Query) once the API exists. Divisions are
  // provisioned elsewhere (seed/migration) — this screen only renames
  // and deletes them, so there is no create mutation to wire.
  const [rawDivisions, setRawDivisions] = useState<DivisionResponse[]>(MOCK_DIVISIONS);
  const isLoading = false;
  const isError = false;

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "count">("name");

  const [viewTarget, setViewTarget] = useState<Division | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Division | null>(null);

  const divisions = useMemo<Division[]>(
    () => mapDivisionsResponseToDivisions(rawDivisions),
    [rawDivisions],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = divisions.filter((d) => !q || d.name.toLowerCase().includes(q));
    list = [...list].sort((a, b) =>
      sortBy === "name" ? a.name.localeCompare(b.name) : b.userCount - a.userCount,
    );
    return list;
  }, [divisions, search, sortBy]);

  // ── Local "mutations" (stand-ins for the real API calls) ──────────
  function handleRename(id: string, newName: string) {
    // Swap for: updateDivisionMutation.mutate({ id, payload: { division_name: newName } })
    setRawDivisions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, division_name: newName } : d)),
    );
  }

  function handleDelete() {
    if (!deleteTarget || deleteTarget.userCount > 0) return;
    // Swap for: deleteDivisionMutation.mutate(deleteTarget.id)
    setRawDivisions((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <>
      <div className="space-y-4">
        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative w-full sm:flex-1 sm:min-w-50">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search divisions…"
              className="w-full pl-9 pr-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:placeholder-gray-500 transition"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "name" | "count")}
            className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
          >
            <option value="name">Sort: Name (A–Z)</option>
            <option value="count">Sort: Most Users</option>
          </select>
        </div>

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10 px-5 py-10 text-center text-red-600 text-theme-sm">
            Failed to load divisions.
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* ── Mobile ── */}
            <div className="md:hidden space-y-3">
              <div
                className={`overflow-y-auto space-y-3 pr-1 ${THIN_SCROLLBAR}`}
                style={{ height: maxMobileHeight }}
              >
                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] px-5 py-10 text-center text-gray-400 text-theme-sm">
                    No divisions match your search.
                  </div>
                ) : (
                  filtered.map((d) => (
                    <DivisionMobileCard
                      key={d.id}
                      division={d}
                      onView={() => setViewTarget(d)}
                      onRename={(newName) => handleRename(d.id, newName)}
                      onDelete={() => setDeleteTarget(d)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* ── Desktop ── */}
            <div className="hidden md:flex md:flex-col rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] overflow-hidden">
              <div className="w-full overflow-x-auto">
                <div
                  className={`overflow-y-auto ${THIN_SCROLLBAR}`}
                  style={{ height: maxTableHeight }}
                >
                  <Table>
                    <TableHeader className="dark:border-white/[0.05] sticky top-0 z-10 bg-white dark:bg-gray-900">
                      <TableRow>
                        {DIVISION_TABLE_COLUMNS.map((col) => (
                          <TableCell
                            key={col.label}
                            isHeader
                            className="px-4 py-3 font-semibold text-primary text-start text-theme-xs dark:text-gray-300 whitespace-nowrap"
                          >
                            {col.label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHeader>

                    <TableBody className="dark:divide-white/[0.05]">
                      {filtered.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-10 text-center text-gray-400 text-theme-sm"
                          >
                            No divisions match your search.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((d) => {
                          const canDelete = d.userCount === 0;
                          return (
                            <TableRow
                              key={d.id}
                              className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                            >
                              <TableCell className="px-4 py-3">
                                <EditableDivisionName
                                  name={d.name}
                                  onSave={(newName) => handleRename(d.id, newName)}
                                />
                              </TableCell>

                              <TableCell className="px-4 py-3">
                                <UserAvatarStack
                                  users={d.users}
                                  onClick={() => setViewTarget(d)}
                                />
                              </TableCell>

                              <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                                {d.userCount}
                              </TableCell>

                              <TableCell className="px-4 py-3">
                                <button
                                  onClick={() => setDeleteTarget(d)}
                                  disabled={!canDelete}
                                  title={
                                    canDelete
                                      ? "Delete division"
                                      : "Can't delete — division still has users"
                                  }
                                  className={`text-theme-xs ${
                                    canDelete
                                      ? "text-danger hover:underline"
                                      : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                                  }`}
                                >
                                  Delete
                                </button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {filtered.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.05]">
                  <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                    Showing{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {filtered.length}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {divisions.length}
                    </span>{" "}
                    divisions
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {viewTarget && (
        <DivisionUsersModal division={viewTarget} onClose={() => setViewTarget(null)} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white dark:bg-gray-900 shadow-xl p-5 space-y-4">
            <h3 className="text-theme-md font-semibold text-gray-800 dark:text-white/90">
              Delete "{deleteTarget.name}"?
            </h3>
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              This division has no users, so it can be removed safely.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-theme-sm font-medium text-white bg-danger hover:bg-danger/90 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import TableShell, { type TableShellColumn } from "../../../components/tables/TableShell";
import { useDivisionManagementTable } from "../hooks/use-division-management-table";
import type { Division, DivisionManagementTableProps } from "../type/division.type";
import DivisionUsersModal from "./DivisionUsersModal";
import EditableDivisionName from "./EditableDivisionName";
import DeleteDivisionModal from "./modal/DeleteDivisionModal";
import UserAvatarStack from "./UserAvatarStack";

const DIVISION_TABLE_COLUMNS: TableShellColumn[] = [
  { label: "Division Name", width: "w-40" },
  { label: "Users", width: "w-40" },
  { label: "Total", width: "w-16" },
  { label: "Action", width: "w-6" },
];

export default function DivisionManagementTable({
  maxTableHeight = "560px",
  maxMobileHeight = "520px",
}: DivisionManagementTableProps = {}) {
  const {
    isLoading,
    isError,
    error,
    divisions,
    search,
    setSearch,
    sort,
    setSort,
    isFiltered,
    clearFilters,
    hasNextPage,
    isFetchingNextPage,
    mobileScrollRef,
    mobileSentinelRef,
    desktopScrollRef,
    desktopSentinelRef,
    viewTarget,
    setViewTarget,
    deleteTarget,
    setDeleteTarget,
    handleRename,
    handleDelete,
  } = useDivisionManagementTable();

  return (
    <>
      <TableShell<Division>
        columns={DIVISION_TABLE_COLUMNS}
        data={divisions}
        isLoading={isLoading}
        isError={isError}
        error={error}
        entityName="divisions"
        emptyMessage="No divisions match your search."
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        mobileScrollRef={mobileScrollRef}
        mobileSentinelRef={mobileSentinelRef}
        desktopScrollRef={desktopScrollRef}
        desktopSentinelRef={desktopSentinelRef}
        maxTableHeight={maxTableHeight}
        maxMobileHeight={maxMobileHeight}
        showMobileCount={false}
        renderToolbar={() => (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="relative w-full sm:flex-1 sm:min-w-50 sm:max-w-md">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 15 11a6 6 0 0112 0z"
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

            <div className="flex gap-3 flex-wrap items-center">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as "name_asc" | "most_users")}
                className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
              >
                <option value="name_asc">Sort: Name (A–Z)</option>
                <option value="most_users">Sort: Most Users</option>
              </select>

              {isFiltered && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-danger whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
        renderMobileCard={(d) => {
          const canDelete = d.userCount === 0;
          return (
            <div
              key={d.id}
              className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <EditableDivisionName name={d.name} onSave={(newName) => handleRename(d.id, newName)} />
                  <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {d.userCount} user{d.userCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteTarget(d)}
                  disabled={!canDelete}
                  title={
                    canDelete ? "Delete division" : "Can't delete — division still has users"
                  }
                  className={`text-theme-xs shrink-0 ${
                    canDelete
                      ? "text-danger hover:underline"
                      : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                  }`}
                >
                  Delete
                </button>
              </div>
              <UserAvatarStack users={d.users} onClick={() => setViewTarget(d)} />
            </div>
          );
        }}
        renderDesktopRow={(d) => {
          const canDelete = d.userCount === 0;
          return (
            <tr key={d.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3">
                <EditableDivisionName
                  name={d.name}
                  onSave={(newName) => handleRename(d.id, newName)}
                />
              </td>

              <td className="px-4 py-3">
                <UserAvatarStack
                  users={d.users}
                  onClick={() => setViewTarget(d)}
                />
              </td>

              <td className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                {d.userCount}
              </td>

              <td className="px-4 py-3">
                <button
                  type="button"
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
              </td>
            </tr>
          );
        }}
      />

      {viewTarget && (
        <DivisionUsersModal division={viewTarget} onClose={() => setViewTarget(null)} />
      )}

      {deleteTarget && (
        <DeleteDivisionModal
          division={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

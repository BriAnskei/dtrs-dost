import Input from "../../../components/form/input/InputField";
import TableShell, { type TableShellColumn } from "../../../components/tables/TableShell";
import KebabMenu, {
  EditIcon,
  TrashIcon,
} from "../../../components/ui/kebab-menu/KebabMenu";
import { useDivisionManagementTable } from "../hooks/use-division-management-table";
import type { Division, DivisionManagementTableProps } from "../type/division.type";
import DivisionUsersModal from "./DivisionUsersModal";
import DeleteDivisionModal from "./modal/DeleteDivisionModal";
import EditDivisionModal from "./modal/EditDivisionModal";
import UserAvatarStack from "./UserAvatarStack";

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
    editTarget,
    setEditTarget,
    handleRename,
    isRenaming,
    renamingId,
    handleDelete,
    isDeleting,
    deleteError,
  } = useDivisionManagementTable();

  const canDelete = (d: Division) => d.userCount === 0;

  const DivisionActions = ({ d }: { d: Division }) => (
    <KebabMenu
      title="Division actions"
      actions={[
        {
          label: "Rename",
          icon: <EditIcon />,
          handler: () => setEditTarget(d),
        },
        {
          label: "Delete",
          icon: <TrashIcon />,
          handler: () => setDeleteTarget(d),
          danger: true,
          disabled: !canDelete(d),
        },
      ]}
    />
  );

  const columns: TableShellColumn<Division>[] = [
    {
      label: "Division Name",
      width: "w-40",
      render: (d) => (
        <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
          {d.name}
        </span>
      ),
    },
    {
      label: "Users",
      width: "w-40",
      render: (d) => <UserAvatarStack users={d.users} onClick={() => setViewTarget(d)} />,
    },
    {
      label: "Total",
      width: "w-16",
      render: (d) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400">
          {d.userCount}
        </span>
      ),
    },
    {
      label: "Action",
      width: "w-6",
      render: (d) => <DivisionActions d={d} />,
    },
  ];

  return (
    <>
      <TableShell<Division>
        columns={columns}
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
        getRowKey={(d) => d.id}
        renderToolbar={() => (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="relative w-full sm:flex-1 sm:min-w-50 sm:max-w-md">
              <Input
                type="text"
                size="sm"
                leadingIcon={
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
                }
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search divisions…"
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
        renderMobileCard={(d) => (
          <div
            key={d.id}
            className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                  {d.name}
                </span>
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {d.userCount} user{d.userCount === 1 ? "" : "s"}
                </p>
              </div>
              <DivisionActions d={d} />
            </div>
            <UserAvatarStack users={d.users} onClick={() => setViewTarget(d)} />
          </div>
        )}
      />

      {viewTarget && (
        <DivisionUsersModal division={viewTarget} onClose={() => setViewTarget(null)} />
      )}

      {deleteTarget && (
        <DeleteDivisionModal
          division={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          isDeleting={isDeleting}
          error={deleteError}
        />
      )}

      {editTarget && (
        <EditDivisionModal
          division={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(newName) => handleRename(editTarget.id, newName)}
          isSaving={isRenaming && renamingId === editTarget.id}
        />
      )}
    </>
  );
}

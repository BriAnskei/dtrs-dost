import MobileCardSkeleton from "../../../components/tables/Skeleton/MobileCardSkeleton";
import TableSkeleton from "../../../components/tables/Skeleton/TableSkeleton";
import Badge from "../../../components/ui/badge/Badge";
import KebabMenu, {
  DisableIcon,
  EditIcon,
} from "../../../components/ui/kebab-menu/KebabMenu";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { THIN_SCROLLBAR } from "../../../contant/ThinScrollBar";
import { ALL_ROLES } from "../constant";
import { getRoleBadgeColor } from "../helpers";
import { useUserManagementTable } from "../hooks/use-user-management-table";
import { EMPTY_FORM } from "../type/creater-user.type";
import type { SystemUser, UserManagementTableProps, UserRole } from "../type/user.type";
import AddUserModal from "./AddUserModal";
import EditUserModal from "./EditUserModal";
import MobileCard from "./MobileCard";

const USER_TABLE_COLUMNS = [
  { label: "Name", width: "w-32", withSubline: true },
  { label: "Role", width: "w-16", pill: true },
  { label: "Email", width: "w-40" },
  { label: "Contact", width: "w-24" },
  { label: "Created At", width: "w-20" },
  { label: "Action", width: "w-6" },
] as const;

export default function UserManagementTable({
  maxTableHeight = "560px",
  maxMobileHeight = "520px",
}: UserManagementTableProps = {}) {
  const {
    isLoading,
    isError,
    error,
    filtered,
    hasFilters,
    toFormState,
    clearFilters,
    search,
    setSearch,
    filterRole,
    setFilterRole,
    sort,
    toggleSort,
    hasNextPage,
    isFetchingNextPage,
    mobileScrollRef,
    mobileSentinelRef,
    desktopScrollRef,
    desktopSentinelRef,
    addModal,
    setAddModal,
    editTarget,
    setEditTarget,
    setDisableTarget,
  } = useUserManagementTable();

  return (
    <>
      <div className="space-y-4">
        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end flex-1">
            <div className="relative w-full sm:flex-1 sm:min-w-50">
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
                    d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or position…"
                className="w-full pl-9 pr-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/8 dark:bg-white/3 dark:text-gray-200 dark:placeholder-gray-500 transition"
              />
            </div>

            <div className="flex gap-3 flex-wrap items-center">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as UserRole | "All")}
                className="flex-1 min-w-32.5 px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/8 dark:bg-white/3 dark:text-gray-200 transition"
              >
                <option value="All">All Roles</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={toggleSort}
                title={sort === "newest" ? "Newest first" : "Oldest first"}
                className="flex items-center gap-1.5 px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-secondary/40 dark:border-white/8 dark:bg-white/3 dark:text-gray-200 transition whitespace-nowrap"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${
                    sort === "oldest" ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 4h13M3 8h9M3 12h5m4 8V4m0 16l-4-4m4 4l4-4"
                  />
                </svg>
                {sort === "newest" ? "Newest" : "Oldest"}
              </button>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors dark:border-white/8 dark:text-gray-400 dark:hover:text-danger whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors whitespace-nowrap"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>

        {isLoading && (
          <>
            <div className="md:hidden">
              <MobileCardSkeleton maxHeight={maxMobileHeight} count={5} />
            </div>
            <TableSkeleton
              maxHeight={maxTableHeight}
              scrollbarClassName={THIN_SCROLLBAR}
              columns={
                USER_TABLE_COLUMNS as unknown as {
                  label: string;
                  width?: string;
                  withSubline?: boolean;
                  pill?: boolean;
                }[]
              }
              rows={8}
            />
          </>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10 px-5 py-10 text-center text-red-600 text-theme-sm">
            Failed to load users{error instanceof Error ? `: ${error.message}` : "."}
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* ── Mobile Cards (< md) ── */}
            <div className="md:hidden space-y-3">
              <div
                ref={mobileScrollRef}
                className={`overflow-y-auto space-y-3 pr-1 ${THIN_SCROLLBAR}`}
                style={{ height: maxMobileHeight, overflowAnchor: "none" }}
              >
                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-white dark:border-white/8 dark:bg-white/3 px-5 py-10 text-center text-gray-400 text-theme-sm">
                    No users match your filters.
                  </div>
                ) : (
                  <>
                    {filtered.map((user) => (
                      <MobileCard
                        key={user.id}
                        user={user}
                        onEdit={() => setEditTarget(user)}
                        onToggleStatus={() => setDisableTarget(user)}
                      />
                    ))}
                    <div ref={mobileSentinelRef} className="h-px" />
                    {isFetchingNextPage && (
                      <p className="text-center text-theme-xs text-gray-400 py-2">
                        Loading more…
                      </p>
                    )}
                    {!hasNextPage && (
                      <p className="text-center text-theme-xs text-gray-300 dark:text-gray-600 py-2">
                        No more users
                      </p>
                    )}
                  </>
                )}
              </div>
              {filtered.length > 0 && (
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 text-right px-1">
                  Showing{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {filtered.length}
                  </span>{" "}
                  users
                </p>
              )}
            </div>

            {/* ── Desktop Table (≥ md) ── */}
            <div className="hidden md:flex md:flex-col rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3 overflow-hidden">
              <div className="w-full overflow-x-auto">
                <div
                  ref={desktopScrollRef}
                  className={`overflow-y-auto ${THIN_SCROLLBAR}`}
                  style={{ height: maxTableHeight, overflowAnchor: "none" }}
                >
                  <Table>
                    <TableHeader className="dark:border-white/5 sticky top-0 z-10 bg-white dark:bg-gray-900">
                      <TableRow>
                        {["Name", "Role", "Email", "Contact", "Created At", "Action"].map(
                          (col) => (
                            <TableCell
                              key={col}
                              isHeader
                              className="px-4 py-3 font-semibold text-primary text-start text-theme-xs dark:text-gray-300 whitespace-nowrap"
                            >
                              {col}
                            </TableCell>
                          ),
                        )}
                      </TableRow>
                    </TableHeader>

                    <TableBody className="dark:divide-white/5">
                      {filtered.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-10 text-center text-gray-400 text-theme-sm"
                          >
                            No users match your filters.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((user: SystemUser) => (
                          <TableRow
                            key={user.id}
                            className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <TableCell className="px-4 py-3">
                              <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                                {user.name}
                              </span>
                              <span className="block text-gray-400 text-theme-xs dark:text-gray-500 mt-0.5">
                                {user.position}
                              </span>
                            </TableCell>

                            <TableCell className="px-4 py-3 whitespace-nowrap">
                              <Badge size="sm" color={getRoleBadgeColor(user.role)}>
                                {user.role}
                              </Badge>
                              {user.role === "Division" && user.divisionName && (
                                <span className="block text-gray-400 text-theme-xs dark:text-gray-500 mt-0.5">
                                  {user.divisionName}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                              <span
                                className="block truncate max-w-[200px]"
                                title={user.email}
                              >
                                {user.email}
                              </span>
                            </TableCell>

                            <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                              {user.contact}
                            </TableCell>

                            <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                              {user.createtAt}
                            </TableCell>

                            <TableCell className="px-4 py-3">
                              <KebabMenu
                                actions={[
                                  {
                                    label: "Edit",
                                    icon: <EditIcon />,
                                    handler: () => setEditTarget(user),
                                  },
                                  {
                                    label: "Disable",
                                    icon: <DisableIcon />,
                                    handler: () => setDisableTarget(user),
                                    danger: true,
                                  },
                                ]}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {filtered.length > 0 && (
                        <tr>
                          <td colSpan={6} className="h-px p-0">
                            <div ref={desktopSentinelRef} className="h-px" />
                          </td>
                        </tr>
                      )}
                      {isFetchingNextPage && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-3 text-center text-theme-xs text-gray-400"
                          >
                            Loading more…
                          </td>
                        </tr>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {filtered.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 dark:border-white/5">
                  <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                    Showing{" "}
                    <span className="font-medium text-gray-600 dark:text-gray-300">
                      {filtered.length}
                    </span>{" "}
                    users
                    {!hasNextPage && " (all loaded)"}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {addModal && (
        <AddUserModal initial={EMPTY_FORM} onClose={() => setAddModal(false)} />
      )}

      {editTarget && (
        <EditUserModal
          userId={editTarget.id}
          initial={toFormState(editTarget)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </>
  );
}

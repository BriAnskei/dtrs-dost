import Input from "../../../components/form/input/InputField";
import TableShell, { type TableShellColumn } from "../../../components/tables/TableShell";
import Badge from "../../../components/ui/badge/Badge";
import KebabMenu, {
  DisableIcon,
  EditIcon,
  KeyIcon,
} from "../../../components/ui/kebab-menu/KebabMenu";
import type { TableShellProp } from "../../../type/table-shell-prop";
import { ALL_ROLES } from "../constants";
import { getRoleBadgeColor } from "../helpers";
import { useUserManagementTable } from "../hooks/use-user-management-table";
import { EMPTY_FORM } from "../types/create-user.type";
import type { SystemUser, UserRole } from "../types/user.type";
import AddUserModal from "./modal/AddUserModal";
import DeactivateUserModal from "./modal/DeactivateUserModal";
import EditUserModal from "./modal/EditUserModal";
import ResetPasswordModal from "./modal/reset/ResetPasswordModal";

export default function UserManagementTable({
  maxTableHeight = "560px",
  maxMobileHeight = "520px",
}: TableShellProp = {}) {
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
    deactivateTarget,
    setDeactivateTarget,
    resetTarget,
    setResetTarget,
  } = useUserManagementTable();

  const userActions = (user: SystemUser) => [
    { label: "Edit", icon: <EditIcon />, handler: () => setEditTarget(user) },
    { label: "Reset Password", icon: <KeyIcon />, handler: () => setResetTarget(user) },
    {
      label: "Deactivate",
      icon: <DisableIcon />,
      handler: () => setDeactivateTarget(user),
      danger: true,
    },
  ];

  const columns: TableShellColumn<SystemUser>[] = [
    {
      label: "Name",
      width: "w-32",
      withSubline: true,
      render: (user) => (
        <>
          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {user.name}
          </span>
          <span className="block text-gray-400 text-theme-xs dark:text-gray-500 mt-0.5">
            {user.position}
          </span>
        </>
      ),
    },
    {
      label: "Role",
      width: "w-16",
      pill: true,
      render: (user) => (
        <>
          <Badge size="sm" color={getRoleBadgeColor(user.role)}>
            {user.role}
          </Badge>
          {user.role === "Division" && user.divisionName && (
            <span className="block text-gray-400 text-theme-xs dark:text-gray-500 mt-0.5">
              {user.divisionName}
            </span>
          )}
        </>
      ),
    },
    {
      label: "Email",
      width: "w-40",
      render: (user) => (
        <span
          className="block truncate max-w-[200px] text-gray-500 text-theme-sm dark:text-gray-400"
          title={user.email}
        >
          {user.email}
        </span>
      ),
    },
    {
      label: "Contact",
      width: "w-24",
      render: (user) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
          {user.contact}
        </span>
      ),
    },
    {
      label: "Created At",
      width: "w-20",
      render: (user) => (
        <span className="text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
          {user.createtAt}
        </span>
      ),
    },
    {
      label: "Action",
      width: "w-6",
      render: (user) => <KebabMenu actions={userActions(user)} />,
    },
  ];

  return (
    <>
      <TableShell<SystemUser>
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        isError={isError}
        error={error}
        entityName="users"
        emptyMessage="No users match your filters."
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        mobileScrollRef={mobileScrollRef}
        mobileSentinelRef={mobileSentinelRef}
        desktopScrollRef={desktopScrollRef}
        desktopSentinelRef={desktopSentinelRef}
        maxTableHeight={maxTableHeight}
        maxMobileHeight={maxMobileHeight}
        getRowKey={(user) => user.id}
        renderToolbar={() => (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            {/* Search - own top-level item, same as Division */}
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
                name="user-search-no-autofill"
                data-form-type="other"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name..."
                autoComplete="new-password"
              />
            </div>

            {/* Everything else - role filter, sort, clear, add user - grouped together on the right */}
            <div className="flex gap-3 flex-wrap items-center">
              <select
                value={filterRole}
                onChange={(e) =>
                  setFilterRole(
                    e.target.value as Exclude<UserRole, "Super Admin"> | "All",
                  )
                }
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
          </div>
        )}
        renderMobileCard={(user) => (
          <div
            key={user.id}
            className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90 leading-snug">
                  {user.name}
                </p>
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {user.position}
                </p>
              </div>
              <KebabMenu actions={userActions(user)} />
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                  Role
                </p>
                <div className="mt-1">
                  <Badge size="sm" color={getRoleBadgeColor(user.role)}>
                    {user.role}
                  </Badge>
                </div>
                {user.role === "Division" && user.divisionName && (
                  <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-1">
                    {user.divisionName}
                  </p>
                )}
              </div>
              <div>
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                  Contact
                </p>
                <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
                  {user.contact}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                  Email
                </p>
                <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                  {user.email}
                </p>
              </div>
              <div>
                <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
                  Created At
                </p>
                <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
                  {user.createtAt}
                </p>
              </div>
            </div>
          </div>
        )}
      />

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

      {resetTarget && (
        <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />
      )}

      {deactivateTarget && (
        <DeactivateUserModal
          user={deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
        />
      )}
    </>
  );
}

import type { CSSProperties } from "react";
import { Search } from "lucide-react";
import Input from "../../../components/form/input/InputField";
import { THIN_SCROLLBAR } from "../../../contant/ThinScrollBar";
import type { TableShellProp } from "../../../type/table-shell-prop";
import { USER_MANAGEMENT_PERMISSIONS } from "../contants";
import { useUserManagementAccessTable } from "../hooks/user-user-management-access-table";
import AdminAccessRow from "./AdminAccessRow";

export default function AccessControlTable({
  maxTableHeight = "560px",
  maxMobileHeight = "520px",
}: TableShellProp = {}) {
  const {
    search,
    setSearch,
    admins,
    permissionsByAdmin,
    savingAdminId,
    saveAdminPermissions,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    scrollRef,
    sentinelRef,
  } = useUserManagementAccessTable();

  const hasFilters = search.trim().length > 0;

  const scrollStyle = {
    "--list-h-mobile": maxMobileHeight,
    "--list-h-desktop": maxTableHeight,
    overflowAnchor: "none",
  } as CSSProperties;

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20">
        <svg
          className="w-4 h-4 text-primary dark:text-secondary flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"
          />
        </svg>
        <p className="text-theme-xs text-primary dark:text-secondary/90 leading-relaxed">
          <span className="font-semibold">Control who can manage users.</span> Search for
          an admin below, switch on their access to the User Management page, then pick
          which functions they're allowed to use. Each admin's changes are saved on their
          own row, so editing one admin never affects another's pending changes.
        </p>
      </div>

      {/* Search + clear filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-md">
          <Input
            type="text"
            size="sm"
            leadingIcon={
              <Search className="w-4 h-4" />
            }
            value={search}
            name="admin-access-search-no-autofill"
            data-form-type="other"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admin by name or email..."
            autoComplete="new-password"
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="w-fit px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors dark:border-white/8 dark:text-gray-400 dark:hover:text-danger whitespace-nowrap"
          >
            Clear
          </button>
        )}
      </div>

      {/* Admin list — scroll container is ALWAYS mounted so the observer's root stays valid */}
      <div
        ref={scrollRef}
        className={`overflow-y-auto space-y-2 pr-1 h-[var(--list-h-mobile)] md:h-[var(--list-h-desktop)] ${THIN_SCROLLBAR}`}
        style={scrollStyle}
      >
        {isLoading ? (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] px-5 py-10 text-center text-gray-400 text-theme-sm">
            Loading admins…
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-danger/20 bg-red-50 dark:bg-red-500/5 px-5 py-10 text-center text-danger text-theme-sm">
            Couldn't load admins. Please try again.
          </div>
        ) : admins.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] px-5 py-10 text-center text-gray-400 text-theme-sm">
            No admins match your search.
          </div>
        ) : (
          <>
            {admins.map((admin) => (
              <AdminAccessRow
                key={admin.id}
                admin={admin}
                permissions={USER_MANAGEMENT_PERMISSIONS}
                savedValues={permissionsByAdmin[admin.id]}
                isSaving={savingAdminId === admin.id}
                onSave={saveAdminPermissions}
              />
            ))}

            {/* Sentinel: must be inside the scroll container, after the last row */}
            <div ref={sentinelRef} className="h-px" />

            {isFetchingNextPage && (
              <p className="text-center text-theme-xs text-gray-400 py-2">
                Loading more…
              </p>
            )}
            {!hasNextPage && (
              <p className="text-center text-theme-xs text-gray-300 dark:text-gray-600 py-2">
                No more admins
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

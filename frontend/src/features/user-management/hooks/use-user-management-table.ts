import { useMemo, useState } from "react";
import { useUsers } from "../hooks/use-users";
import type { UserFormState } from "../type/creater-user.type";
import type { SystemUser, UserRole } from "../type/user.type";
import { mapUsersResponseToSystemUsers } from "../utils/mapUserResponseToSystemUser";

/**
 * Encapsulates all UI state and derived logic for the user-management table.
 *
 * The companion `UserManagementTable` component should call this hook and
 * render pure JSX — no `useState` / `useMemo` lives in the component body.
 *
 * State buckets:
 *  - query (from `useUsers`)
 *  - disable-toggle overrides (UI-only; the real API call is not wired yet)
 *  - search text + role filter
 *  - modal open/target tracking (add / edit / disable)
 */
export function useUserManagementTable() {
  const { data: usersResponse, isLoading, isError, error } = useUsers();

  // ── Local, UI-only overrides for the still-unwired disable toggle ──────
  // Real Add/Edit mutations land in the ["users"] cache directly and therefore
  // need no entry here. Server data always wins on refetch.
  // Setter omitted: disable-toggle is still-unwired (update feature comes later).
  const [localOverrides] = useState<SystemUser[]>([]);

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "All">("All");

  // Modal state
  const [addModal, setAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SystemUser | null>(null);
  const [disableTarget, setDisableTarget] = useState<SystemUser | null>(null);

  // ── Derived data: API response -> view model ──────────────────────────
  const users = useMemo<SystemUser[]>(() => {
    const fromApi = usersResponse
      ? mapUsersResponseToSystemUsers(usersResponse)
      : [];
    // Only disable-toggle overrides live here now; anything already present
    // in fromApi (post add/edit, via cache) takes precedence over a stale
    // local override with the same id.
    const overriddenIds = new Set(fromApi.map((u) => u.id));
    const staleOverrides = localOverrides.filter((u) => !overriddenIds.has(u.id));
    return [...staleOverrides, ...fromApi];
  }, [usersResponse, localOverrides]);

  // ── Filtered list ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (!u) return false;
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.position.toLowerCase().includes(q);
      const matchesRole = filterRole === "All" || u.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [users, search, filterRole]);

  const hasFilters = !!search || filterRole !== "All";

  function clearFilters() {
    setSearch("");
    setFilterRole("All");
  }

  /** Convert a view-model back into the shape the form expects. */
  function toFormState(user: SystemUser): UserFormState {
    return {
      name: user.name,
      position: user.position,
      role: user.role,
      email: user.email,
      contact: user.contact,
      password: "", // left blank on edit; AddUserModal only requires it in "add" mode
    };
  }

  return {
    // query
    usersResponse,
    isLoading,
    isError,
    error,
    // derived
    users,
    filtered,
    hasFilters,
    toFormState,
    clearFilters,
    // search / filter
    search,
    setSearch,
    filterRole,
    setFilterRole,
    // modal state
    addModal,
    setAddModal,
    editTarget,
    setEditTarget,
    disableTarget,
    setDisableTarget,
  };
}

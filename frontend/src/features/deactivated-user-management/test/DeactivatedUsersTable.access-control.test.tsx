/**
 * Access-control + infinite-scroll unit tests for `DeactivatedUsersTable`.
 *
 * WHY THIS FILE EXISTS:
 *
 * The component-level tests in
 * `components/DeactivatedUsersTable.test.tsx` cover toolbar interactions,
 * kebab→modal wiring, loading/error states, and scroll footers — but they do
 * NOT exercise the access-control layer added in the recent
 * claims-based-authorization work (commits `7dc1c51` and `23f0acb`). That
 * existing test file fails today because the component now calls
 * `useUserManagementPermissionsHelper()`, which internally calls `useUser()` →
 * `useContext(UserContext)` — and without a provider the context is `undefined`.
 *
 * THIS file mocks BOTH dependencies — the table hook AND the permissions
 * helper — so we can deterministically simulate every role/permission
 * combination and assert what the component renders.
 *
 * ─── ACCESS CONTROL CHAIN (frontend ↔ backend) ─────────────────────────────
 *
 *   Frontend:
 *     PermissionRoute.tsx  → route guard: Super Admin (role_id===1) bypasses;
 *                            otherwise `hasPermission(currentUser)` decides.
 *     hasModulePermission() → Super Admin bypass; else reads
 *                            `user.permissions.user_management_permissions`.
 *     usePermissions()      → wraps `useUser()` + `hasModulePermission`.
 *     useUserManagementPermissionsHelper() → returns the boolean flags
 *                            { canView, canAdd, canEdit, canResetPassword,
 *                              canDeactivate, canReactivate, canDelete,
 *                              hasAnyRowAction, hasAnyDeactivatedRowAction }.
 *
 *   Backend (NestJS):
 *     RolesGuard      → `@Roles(Role.SuperAdmin, Role.Admin)` restricts every
 *                        mutating endpoint to role_id 1 or 2.
 *     PermissionsGuard → `@RequirePermission(Domain.UserManagement, …)` checks
 *                        the specific permission bit. Super Admin bypasses;
 *                        Admin must have the flag set to `true`. A missing
 *                        flag throws `ForbiddenException(403)`.
 *
 *   Toast safety-net (backend → hook → UI):
 *     If a disabled action somehow reaches the backend, PermissionsGuard
 *     returns 403. The mutation hooks catch it and call:
 *       toast.error(getApiErrorMessage(error, "Failed to reactivate user"))
 *       toast.error(getApiErrorMessage(error, "Failed to permanently delete user"))
 *     The component prevents this in two layers:
 *       (1) UI-level: `disabled={!canX}` + `disabledReason` tooltip.
 *       (2) Defensive: `{target && canX && <Modal/>}` — stale state can't
 *           open a modal without the permission.
 *
 * ─── PERMISSION → ACTION MAPPING (deactivated table) ────────────────────────
 *
 *   Backend enum          Frontend flag      Component action
 *   ───────────────────   ────────────────   ──────────────────────
 *   View                  canView            (route guard only)
 *   Reactivate            canReactivate      Kebab → "Reactivate"
 *   Delete                 canDelete          Kebab → "Delete" (danger)
 *
 *   hasAnyDeactivatedRowAction = canReactivate || canDelete
 *     → false → render "—" instead of a KebabMenu
 *
 *   NOTE: There is NO "Add User" button on this table — deactivated users
 *   are reactivated or deleted, not created here.
 *
 * ─── WHAT THIS FILE TESTS ──────────────────────────────────────────────────
 *
 *   1. Super Admin  — all permissions true (bypass); both actions enabled.
 *   2. Admin (full) — all 7 flags true; both actions enabled.
 *   3. Admin (limited) — individual flags false → specific action disabled
 *      with `disabledReason` tooltip; the other stays enabled.
 *   4. Admin (none)  — canReactivate=false, canDelete=false → dash "—",
 *      defensive guard keeps modals from rendering.
 *   5. Not-allowed actions — disabled kebab does NOT fire handler (no API
 *      call → no backend 403 → no toast).
 *   6. Infinite scroll — "Loading more…" / "No more deactivated users" /
 *      "(all loaded)" footers driven by `hasNextPage` / `isFetchingNextPage`.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SystemUser, UserRole } from "../../user-management/types/user.type";
import DeactivatedUsersTable from "../components/DeactivatedUsersTable";

// ─── Mocked permissions helper ────────────────────────────────────────────────
//
// We replace the real hook so each test can inject a tailored permission set.
// This simulates the different roles the backend would return:
//
//   role_id 1 (Super Admin)  → `hasModulePermission` returns `true` for ALL flags.
//   role_id 2 (Admin)        → flags come from `user.permissions.user_management_permissions`.
//   role_id 3/4 (Receiver/Division) → permissions null → ALL flags false.
//
const { mockPermissions } = vi.hoisted(() => ({
  mockPermissions: vi.fn(),
}));

vi.mock(
  "../../user-management/hooks/permission/use-user-management-permissions-helper",
  () => ({
    useUserManagementPermissionsHelper: mockPermissions,
  }),
);

// ─── Mocked table hook (stateful) ───────────────────────────────────────────────
// Same strategy as the existing component test: real `useState`/`useRef` inside
// `mockImplementation` so that interactions (typing search, clicking kebab,
// toggling sort) actually re-render the component and we can assert on the DOM.
const { mockUseDeactivatedUserTable } = vi.hoisted(() => ({
  mockUseDeactivatedUserTable: vi.fn(),
}));

vi.mock("../hooks/use-deactivated-users-table", () => ({
  useDeactivatedUserTable: mockUseDeactivatedUserTable,
}));

// ─── Modal stubs ──────────────────────────────────────────────────────────────
//
// Each stub renders a `data-testid` marker + the targeted user's name so we can
// assert *which* user an action was fired on, and whether the modal rendered
// at all (the defensive-guard tests). We deliberately do NOT render real
// modals — the modal internals (forms, mutations, query-client) are out of
// scope here.

vi.mock("./modal/ReactivateUserModal", () => ({
  default: function ReactivateUserModalStub({
    user,
    onClose,
  }: {
    user?: SystemUser | null;
    onClose: () => void;
  }) {
    return (
      <div data-testid="reactivate-user-modal">
        Reactivate {user?.name}
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

vi.mock("./modal/PermanentDeleteUserModal", () => ({
  default: function PermanentDeleteUserModalStub({
    user,
    onClose,
  }: {
    user?: SystemUser | null;
    onClose: () => void;
  }) {
    return (
      <div data-testid="permanent-delete-user-modal">
        Delete {user?.name}
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

// ─── Skeleton stubs ───────────────────────────────────────────────────────────

vi.mock("../../../components/tables/Skeleton/MobileCardSkeleton", () => ({
  default: function MobileCardSkeletonStub() {
    return <div data-testid="mobile-skeleton" />;
  },
}));

vi.mock("../../../components/tables/Skeleton/TableSkeleton", () => ({
  default: function TableSkeletonStub() {
    return <div data-testid="desktop-skeleton" />;
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** The role-select type excludes "Super Admin" exactly like the hook. */
type FilterRole = Exclude<UserRole, "Super Admin"> | "All";

/** The type for sort direction is shared across tables. */
type SortDirection = "newest" | "oldest";

const DEACTIVATED_USERS: SystemUser[] = [
  {
    id: "u1",
    name: "Alice Reyes",
    position: "Engineer",
    divisionName: "NCR",
    role: "Division",
    email: "alice@peo.gov.ph",
    contact: "09171234567",
    createtAt: "Jan 2025",
    deactivatedAt: "Feb 2025",
  },
  {
    id: "u2",
    name: "Bob Santos",
    position: "Receiver",
    divisionName: undefined,
    role: "Receiver",
    email: "bob@peo.gov.ph",
    contact: "09179876543",
    createtAt: "Feb 2025",
    deactivatedAt: "Mar 2025",
  },
];

/** The single user handed to kebab-action tests (one row = one menu). */
const ALICE: SystemUser = DEACTIVATED_USERS[0]!;

/**
 * The full permission-flag set that `useUserManagementPermissionsHelper`
 * returns. Mirrors the real hook's return shape.
 *
 * Field → backend enum mapping:
 *   canView          → UserManagementPermission.View
 *   canAdd           → UserManagementPermission.Add  (not used on this table)
 *   canEdit          → UserManagementPermission.Edit (not used here)
 *   canResetPassword → UserManagementPermission.ResetPassword
 *   canDeactivate    → UserManagementPermission.Deactivate
 *   canReactivate    → UserManagementPermission.Reactivate   (this table)
 *   canDelete        → UserManagementPermission.Delete        (this table)
 */
interface PermissionsResult {
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canResetPassword: boolean;
  canDeactivate: boolean;
  canReactivate: boolean;
  canDelete: boolean;
  hasAnyRowAction: boolean;
  hasAnyDeactivatedRowAction: boolean;
}

/**
 * Build a permission result mirroring the real hook's derivation logic:
 *
 *   hasAnyRowAction            = canEdit || canResetPassword || canDeactivate
 *   hasAnyDeactivatedRowAction = canReactivate || canDelete
 *
 * Call with no overrides → everything true (Super Admin / full-permission Admin).
 * Pass `{ canReactivate: false }` → Reactivate disabled, Delete stays enabled.
 */
function makePermissions(
  overrides: Partial<PermissionsResult> = {},
): PermissionsResult {
  const canReactivate = overrides.canReactivate ?? true;
  const canDelete = overrides.canDelete ?? true;
  const canEdit = overrides.canEdit ?? true;
  const canResetPassword = overrides.canResetPassword ?? true;
  const canDeactivate = overrides.canDeactivate ?? true;

  return {
    canView: overrides.canView ?? true,
    canAdd: overrides.canAdd ?? true,
    canReactivate,
    canDelete,
    canEdit,
    canResetPassword,
    canDeactivate,
    hasAnyRowAction: canEdit || canResetPassword || canDeactivate,
    hasAnyDeactivatedRowAction: canReactivate || canDelete,
  };
}

/** Display-flag overrides that drive what TableShell renders. */
interface HookDisplayState {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  filtered?: SystemUser[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  /** Pre-seeded modal targets (for defensive-guard tests). */
  presetTargets?: {
    reactivateTarget?: SystemUser | null;
    deleteTarget?: SystemUser | null;
  };
}

/**
 * Build a stateful mock implementation for `useDeactivatedUserTable`.
 *
 * Real `useState`/`useRef` inside so user interactions (typing search,
 * clicking kebab, toggling sort) re-render the component and we can assert
 * on the resulting DOM. Display flags come from `overrides`; modal state
 * starts from `presetTargets` when provided.
 *
 * The hook return shape matches `useDeactivatedUserTable` exactly — note the
 * field names differ from the active-users table:
 *   - `reactivateTarget` / `setReactivateTarget` (not editTarget)
 *   - `deleteTarget` / `setDeleteTarget`         (not deactivateTarget)
 *   - `toggleSort` (not `toggleSort`) — same name, same signature
 */
function makeHookImpl(overrides: HookDisplayState = {}) {
  return function useDeactivatedUserTable() {
    const [search, setSearch] = React.useState("");
    const [filterRole, setFilterRole] = React.useState<FilterRole>("All");
    const [sort, setSort] = React.useState<SortDirection>("newest");
    const [reactivateTarget, setReactivateTarget] =
      React.useState<SystemUser | null>(
        overrides.presetTargets?.reactivateTarget ?? null,
      );
    const [deleteTarget, setDeleteTarget] = React.useState<SystemUser | null>(
      overrides.presetTargets?.deleteTarget ?? null,
    );

    const mobileScrollRef = React.useRef<HTMLDivElement | null>(null);
    const mobileSentinelRef = React.useRef<HTMLDivElement | null>(null);
    const desktopScrollRef = React.useRef<HTMLDivElement | null>(null);
    const desktopSentinelRef = React.useRef<HTMLDivElement | null>(null);

    // Mirrors the real hook: filters are "active" when any non-default value.
    const hasFilters = !!search || filterRole !== "All" || sort !== "newest";

    const toggleSort = React.useCallback(() => {
      setSort((prev) => (prev === "newest" ? "oldest" : "newest"));
    }, []);

    const clearFilters = React.useCallback(() => {
      setSearch("");
      setFilterRole("All");
      setSort("newest");
    }, []);

    const toFormState = React.useCallback(
      (user: SystemUser) => ({
        name: user.name,
        position: user.position,
        role: user.role,
        email: user.email,
        contact: user.contact,
        division: user.divisionName,
        password: "",
      }),
      [],
    );

    return {
      isLoading: overrides.isLoading ?? false,
      isError: overrides.isError ?? false,
      error: overrides.error ?? null,
      filtered: overrides.filtered ?? [],
      hasFilters,
      toFormState,
      clearFilters,
      search,
      setSearch,
      filterRole,
      setFilterRole,
      sort,
      toggleSort,
      hasNextPage: overrides.hasNextPage ?? false,
      isFetchingNextPage: overrides.isFetchingNextPage ?? false,
      mobileScrollRef,
      mobileSentinelRef,
      desktopScrollRef,
      desktopSentinelRef,
      reactivateTarget,
      setReactivateTarget,
      deleteTarget,
      setDeleteTarget,
    };
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeactivatedUsersTable — access control", () => {
  beforeEach(() => {
    // Default: Super Admin permissions (all flags true) + loaded data.
    mockPermissions.mockReturnValue(makePermissions());
    mockUseDeactivatedUserTable.mockImplementation(
      makeHookImpl({ filtered: DEACTIVATED_USERS, hasNextPage: true }),
    );
  });

  // ── Super Admin (role_id 1) ─────────────────────────────────────────────

  describe("Super Admin (role_id 1 — permission bypass)", () => {
    /*
     * The backend `PermissionsGuard` short-circuits to `true` when
     * `user.role_id === Role.SuperAdmin (1)`. The frontend
     * `hasModulePermission` does the same. So Super Admin has ALL seven
     * permission flags regardless of what's stored in
     * `user.permissions.user_management_permissions`.
     *
     * `useUserManagementPermissionsHelper` therefore returns all-`true`,
     * which means:
     *   - canReactivate === true   → Reactivate kebab item is enabled
     *   - canDelete === true       → Delete (danger) kebab item is enabled
     *   - hasAnyDeactivatedRowAction === true → KebabMenu renders (NOT a dash)
     *
     * There is NO "Add User" button on this table.
     */

    it("renders all kebab actions as enabled (no aria-disabled, no tooltip)", () => {
      /*
       * Open Alice's kebab menu and verify both action buttons are interactive:
       *   - Reactivate and Delete must NOT have aria-disabled="true".
       *   - No tooltip (disabledReason title) on either of them.
       */
      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      const reactivateBtn = screen.getByRole("button", { name: "Reactivate" });
      const deleteBtn = screen.getByRole("button", { name: "Delete" });

      expect(reactivateBtn).not.toHaveAttribute("aria-disabled", "true");
      expect(deleteBtn).not.toHaveAttribute("aria-disabled", "true");

      // Enabled actions carry no disabledReason tooltip.
      expect(reactivateBtn).not.toHaveAttribute(
        "title",
        expect.stringContaining("You don't have permission"),
      );
      expect(deleteBtn).not.toHaveAttribute(
        "title",
        expect.stringContaining("You don't have permission"),
      );
    });

    it("renders a KebabMenu (not a dash) when hasAnyDeactivatedRowAction is true", () => {
      /*
       * When at least one row action is allowed, `renderActions` returns
       * `<KebabMenu actions={userActions(user)} />` — which mounts the
       * "More actions" trigger button. When ALL are disabled, it renders a
       * plain "—" span instead.
       */
      render(<DeactivatedUsersTable />);

      // Two kebab triggers per row (mobile card + desktop row).
      expect(screen.getAllByTitle("More actions").length).toBeGreaterThanOrEqual(
        2,
      );
      // No dash placeholder in the Action column.
      expect(screen.queryByText("—")).not.toBeInTheDocument();
    });
  });

  // ── Admin with full permissions (all flags true) ───────────────────────────

  describe("Admin with full permissions", () => {
    /*
     * Admin (role_id 2) is NOT bypassed — the frontend checks each permission
     * flag individually via `hasPermission(user.permissions[domain], flag)`.
     * But an Admin whose `user_management_permissions` object has every flag
     * set to `true` behaves identically to Super Admin at the component level:
     * both actions are enabled.
     *
     * Backend equivalent: `PermissionsGuard` checks
     * `permissions[permission] === true` — the Admin row in the DB has all
     * flags set.
     */

    it("enables both kebab actions (identical to Super Admin)", () => {
      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      expect(screen.getByRole("button", { name: "Reactivate" })).not.toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(screen.getByRole("button", { name: "Delete" })).not.toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });
  });

  // ── Admin with limited permissions ───────────────────────────────────────

  describe("Admin with limited permissions (selective flags false)", () => {
    /*
     * When an Admin's permission flags are selectively revoked, only the
     * corresponding action is disabled. The KebabMenu renders each action
     * with `disabled: true` and `disabledReason: noPermission("…")` which
     * becomes the button's `title` (tooltip). The other action stays enabled.
     *
     * Backend equivalent: `@RequirePermission(Domain, Permission.X)` returns
     * 403 when `permissions["x"]` is `false`. On the frontend, the flag is
     * `false` → action disabled → user never reaches the backend.
     */

    it("canReactivate=false disables Reactivate (tooltip set, Delete stays enabled)", () => {
      /*
       * Revoking canReactivate must NOT also disable canDelete — permissions
       * are checked independently, one guard per flag.
       */
      mockPermissions.mockReturnValue(makePermissions({ canReactivate: false }));

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      const reactivateBtn = screen.getByRole("button", { name: "Reactivate" });
      expect(reactivateBtn).toHaveAttribute("aria-disabled", "true");
      expect(reactivateBtn).toHaveAttribute(
        "title",
        "You don't have permission to reactivate users",
      );

      // Delete stays enabled.
      expect(screen.getByRole("button", { name: "Delete" })).not.toHaveAttribute(
        "aria-disabled",
        "true",
      );
    });

    it("canDelete=false disables Delete (danger) with tooltip (Reactivate stays enabled)", () => {
      /*
       * Revoking canDelete must NOT also disable canReactivate.
       * `noPermission("permanently delete users")` →
       *   "You don't have permission to permanently delete users"
       */
      mockPermissions.mockReturnValue(makePermissions({ canDelete: false }));

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      const deleteBtn = screen.getByRole("button", { name: "Delete" });
      expect(deleteBtn).toHaveAttribute("aria-disabled", "true");
      expect(deleteBtn).toHaveAttribute(
        "title",
        "You don't have permission to permanently delete users",
      );

      // Reactivate stays enabled.
      expect(
        screen.getByRole("button", { name: "Reactivate" }),
      ).not.toHaveAttribute("aria-disabled", "true");
    });
  });

  // ── Admin with NO deactivated-user permissions ─────────────────────────────

  describe("Admin with no deactivated-user permissions (all flags false)", () => {
    /*
     * An Admin whose `user_management_permissions` has canReactivate=false AND
     * canDelete=false sees:
     *
     *   - hasAnyDeactivatedRowAction === false → no KebabMenu, just a "—" dash.
     *   - Defensive guard: even if modal-target state is stale/true, the
     *     `{target && canX && <Modal/>}` expression evaluates to false → no
     *     modal renders, so no API call → no backend 403 → no toast.
     *
     * Backend equivalent: `RolesGuard` allows Admin through, but
     * `PermissionsGuard` returns 403 because `permissions[permission]` is
     * false for every flag.
     */

    it("renders a dash ('—') instead of a KebabMenu when both row actions are disabled", () => {
      /*
       * hasAnyDeactivatedRowAction = canReactivate || canDelete.
       * When both are false the component short-circuits to a plain dash —
       * no menu to click, no actions to fire.
       */
      mockPermissions.mockReturnValue(
        makePermissions({
          canReactivate: false,
          canDelete: false,
        }),
      );

      render(<DeactivatedUsersTable />);

      // No kebab trigger anywhere.
      expect(screen.queryByTitle("More actions")).not.toBeInTheDocument();
      // Dash placeholder in the Action column (mobile + desktop).
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    });

    it("defensive guard: ReactivateUserModal does NOT render even if reactivateTarget state is set but canReactivate is false", () => {
      /*
       * The component guards modal rendering with:
       *   {reactivateTarget && canReactivate && <ReactivateUserModal …/>}
       *
       * This test pre-seeds `reactivateTarget` in the mocked hook (simulating
       * a stale state where the user opened the reactivate modal, then their
       * permission was revoked) and asserts the modal stub does NOT appear.
       *
       * This is the component-level safety net: even without the backend 403
       * + toast, the UI never shows a modal the user can't act on.
       */
      mockPermissions.mockReturnValue(makePermissions({ canReactivate: false }));

      mockUseDeactivatedUserTable.mockImplementation(
        makeHookImpl({
          filtered: DEACTIVATED_USERS,
          presetTargets: { reactivateTarget: ALICE },
        }),
      );

      render(<DeactivatedUsersTable />);

      expect(screen.queryByTestId("reactivate-user-modal")).not.toBeInTheDocument();
    });

    it("defensive guard: PermanentDeleteUserModal does NOT render if deleteTarget set but canDelete is false", () => {
      /*
       *   {deleteTarget && canDelete && <PermanentDeleteUserModal …/>}
       *
       * Pre-seed deleteTarget=true with canDelete=false → modal must not appear.
       */
      mockPermissions.mockReturnValue(makePermissions({ canDelete: false }));
      mockUseDeactivatedUserTable.mockImplementation(
        makeHookImpl({
          filtered: DEACTIVATED_USERS,
          presetTargets: { deleteTarget: ALICE },
        }),
      );

      render(<DeactivatedUsersTable />);

      expect(
        screen.queryByTestId("permanent-delete-user-modal"),
      ).not.toBeInTheDocument();
    });
  });

  // ── Not-allowed actions: no toast, no handler fire ─────────────────────

  describe("Not-allowed actions: disabled → no handler → no toast", () => {
    /*
     * The component prevents not-allowed actions in TWO layers:
     *
     *   1. UI-level: `disabled={!canX}` + `disabledReason` tooltip.
     *      The KebabMenu's onClick checks `if (action.disabled) return` so
     *      the handler never fires → no state change → no modal → no API call.
     *
     *   2. Defensive guard: `{target && canX && <Modal/>}` — even if state
     *      is stale, the modal won't render.
     *
     * If layer 1 fails (e.g. a bug bypasses the disabled check), layer 2
     * still blocks the modal. And if the API call somehow reaches the backend
     * anyway, `@RequirePermission` throws 403 — the mutation hook catches it
     * and calls:
     *   toast.error(getApiErrorMessage(error, "Failed to reactivate user"))
     *   toast.error(getApiErrorMessage(error, "Failed to permanently delete user"))
     *
     * These tests assert the component-level prevention — the backend/toast
     * layer is owned by the hooks (not covered here per scope).
     */

    it("clicking a disabled kebab action does NOT fire the handler (no modal opens)", () => {
      /*
       * canReactivate=false → Reactivate kebab item is disabled. Clicking it:
       *   - KebabMenu's onClick sees `action.disabled === true` → returns early.
       *   - setReactivateTarget is never called → reactivateTarget stays null.
       *   - `{reactivateTarget && canReactivate && <ReactivateUserModal/>}` → no modal.
       *   - No API call → no backend 403 → no toast.
       */
      mockPermissions.mockReturnValue(makePermissions({ canReactivate: false }));
      mockUseDeactivatedUserTable.mockImplementation(
        makeHookImpl({ filtered: [ALICE] }),
      );

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);
      fireEvent.click(screen.getByRole("button", { name: "Reactivate" }));

      // Modal never appears — handler didn't fire.
      expect(screen.queryByTestId("reactivate-user-modal")).not.toBeInTheDocument();
    });

    it("clicking a disabled Delete (danger) action does NOT fire the handler", () => {
      /*
       * canDelete=false → Delete kebab item is disabled. Clicking it must not
       * call setDeleteTarget → no PermanentDeleteUserModal.
       */
      mockPermissions.mockReturnValue(makePermissions({ canDelete: false }));
      mockUseDeactivatedUserTable.mockImplementation(
        makeHookImpl({ filtered: [ALICE] }),
      );

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(
        screen.queryByTestId("permanent-delete-user-modal"),
      ).not.toBeInTheDocument();
    });
  });

  // ── Infinite scroll footers ─────────────────────────────────────────────

  describe("Infinite scroll footers", () => {
    /*
     * TableShell renders different footers based on `hasNextPage` and
     * `isFetchingNextPage` (both come from the table hook):
     *
     *   isLoading (initial load)
     *     → skeletons, NO data rows, NO footers
     *
     *   Data loaded + isFetchingNextPage=true
     *     → "Loading more…" (mobile) + "Loading more…" (desktop table) = 2
     *
     *   Data loaded + hasNextPage=false (all loaded)
     *     → "No more deactivated users" (mobile footer)
     *     → "Showing N deactivated users (all loaded)" (desktop summary)
     *
     *   Data loaded + hasNextPage=true + isFetchingNextPage=false (idle, more)
     *     → NO footers (sentinel armed, not firing)
     *
     * These tests use DEACTIVATED_USERS (2 items) as the `filtered` data so
     * the footers appear inside the data section.
     */

    it("shows 'Loading more…' while isFetchingNextPage is true (mobile + desktop = 2)", () => {
      /*
       * The "Loading more…" footer is gated on `isFetchingNextPage` and only
       * renders inside the data section (post-initial-load). It appears once
       * for the mobile list and once for the desktop table body → 2 occurrences.
       */
      mockUseDeactivatedUserTable.mockImplementation(
        makeHookImpl({
          filtered: DEACTIVATED_USERS,
          hasNextPage: true,
          isFetchingNextPage: true,
        }),
      );

      render(<DeactivatedUsersTable />);

      expect(screen.getAllByText(/Loading more/i)).toHaveLength(2);
      // While fetching, "No more" / "(all loaded)" must NOT appear.
      expect(screen.queryByText(/No more deactivated users/i)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/\(all loaded\)/);
    });

    it("shows 'No more deactivated users' (mobile) + '(all loaded)' (desktop) when hasNextPage is false", () => {
      /*
       * hasNextPage=false means the cursor is exhausted — the sentinel
       * observer is disabled (`enabled: false`). On mobile the footer reads
       * "No more deactivated users"; on desktop TableShell never renders "No
       * more" — instead the summary row appends "(all loaded)" to
       * "Showing N deactivated users".
       */
      mockUseDeactivatedUserTable.mockImplementation(
        makeHookImpl({
          filtered: DEACTIVATED_USERS,
          hasNextPage: false,
          isFetchingNextPage: false,
        }),
      );

      render(<DeactivatedUsersTable />);

      // Mobile-only footer.
      expect(screen.getAllByText(/No more deactivated users/i)).toHaveLength(1);
      // Desktop summary switches to the "(all loaded)" affordance.
      expect(document.body.textContent).toMatch(/\(all loaded\)/);
      // No "Loading more" while idle.
      expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    });

    it("hides both footers while idle and more pages remain", () => {
      /*
       * hasNextPage=true, isFetchingNextPage=false → sentinel is armed but
       * not firing. Neither "Loading more…" nor "No more" should appear.
       * The user just sees the current page's data.
       */
      mockUseDeactivatedUserTable.mockImplementation(
        makeHookImpl({
          filtered: DEACTIVATED_USERS,
          hasNextPage: true,
          isFetchingNextPage: false,
        }),
      );

      render(<DeactivatedUsersTable />);

      expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/No more/i)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/\(all loaded\)/);
    });

    it("shows skeletons during isLoading with NO footers or data rows", () => {
      /*
       * isLoading is the first-render guard. TableShell swaps the body for
       * skeletons and does NOT render data rows, "Loading more…", or
       * "No more deactivated users".
       */
      mockUseDeactivatedUserTable.mockImplementation(
        makeHookImpl({
          filtered: DEACTIVATED_USERS,
          isLoading: true,
        }),
      );

      render(<DeactivatedUsersTable />);

      expect(screen.getByTestId("mobile-skeleton")).toBeInTheDocument();
      expect(screen.getByTestId("desktop-skeleton")).toBeInTheDocument();
      // No data during initial load.
      expect(screen.queryByText("Alice Reyes")).not.toBeInTheDocument();
      // No footers either.
      expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/No more/i)).not.toBeInTheDocument();
    });
  });

  // ── Error state ───────────────────────────────────────────────────────

  describe("Error state", () => {
    /*
     * When `isError` is true TableShell renders the entity-specific error
     * banner: `Failed to load deactivated users: {error.message}` and
     * suppresses the data body. This proves the `entityName` prop ("deactivated
     * users") flows into both the error banner and the empty-state footer.
     */

    it("renders the entity-specific error banner and hides rows", () => {
      mockUseDeactivatedUserTable.mockImplementation(
        makeHookImpl({
          filtered: DEACTIVATED_USERS,
          isError: true,
          error: new Error("Killed by gremlins"),
        }),
      );

      render(<DeactivatedUsersTable />);

      expect(
        screen.getByText(/Failed to load deactivated users: Killed by gremlins/),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("desktop-skeleton")).not.toBeInTheDocument();
      expect(screen.queryByText("Alice Reyes")).not.toBeInTheDocument();
    });
  });

  // ── Empty state ────────────────────────────────────────────────────────

  describe("Empty state", () => {
    /*
     * When `filtered` is an empty array (no matches) TableShell renders the
     * component-specific `emptyMessage`: "No deactivated users match your
     * filters." — this is distinct from the "No more…" scroll footer.
     */

    it("renders the empty message when there are no matching users", () => {
      mockUseDeactivatedUserTable.mockImplementation(
        makeHookImpl({ filtered: [] }),
      );

      render(<DeactivatedUsersTable />);

      // Appears once in the mobile card + once in the desktop table.
      expect(
        screen.getAllByText(/No deactivated users match your filters/),
      ).toHaveLength(2);
      expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    });
  });
});

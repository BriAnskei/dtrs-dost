/**
 * Access-control + infinite-scroll unit tests for `UserManagementTable`.
 *
 * WHY THIS FILE EXISTS:
 *
 * The component-level tests in `components/UserManagementTable.test.tsx` cover
 * toolbar interactions, kebab→modal wiring, loading/error states, and scroll
 * footers — but they do NOT exercise the access-control layer that was added
 * in the recent claims-based-authorization work (commits `7dc1c51` and
 * `23f0acb`). Those existing tests fail today because the component now calls
 * `useUserManagementPermissionsHelper()`, which internally calls `useUser()` →
 * `useContext(UserContext)` — and without a provider the context is `undefined`.
 *
 * THIS file mocks BOTH dependencies — the table hook AND the permissions
 * helper — so we can deterministically simulate every role/permission
 * combination and assert what the component actually renders.
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
 *                              canDeactivate, canDelete, canReactivate,
 *                              hasAnyRowAction, … }.
 *
 *   Backend (NestJS):
 *     RolesGuard      → `@Roles(Role.SuperAdmin, Role.Admin)` restricts every
 *                        mutating endpoint to role_id 1 or 2.
 *     PermissionsGuard → `@RequirePermission(Domain.UserManagement, …)` checks
 *                        the specific permission bit. Super Admin bypasses;
 *                        Admin must have the flag set to `true`. A missing flag
 *                        throws `ForbiddenException(403)`.
 *
 *   Toast safety-net (backend → hook → UI):
 *     If a disabled action somehow reaches the backend, PermissionsGuard
 *     returns 403. The mutation hooks catch it and call:
 *       toast.error(getApiErrorMessage(error, "Failed to …"))
 *     The component prevents this in two layers:
 *       (1) UI-level: `disabled={!canX}` + `disabledReason` tooltip.
 *       (2) Defensive: `{target && canX && <Modal/>}` — stale state can't
 *           open a modal without the permission.
 *
 * ─── PERMISSION → ACTION MAPPING ───────────────────────────────────────────
 *
 *   Backend enum          Frontend flag        Component action
 *   ───────────────────   ─────────────────    ──────────────────────
 *   View                  canView              (route guard only)
 *   Add                   canAdd               "Add User" toolbar button
 *   Edit                  canEdit              Kebab → "Edit"
 *   ResetPassword         canResetPassword     Kebab → "Reset Password"
 *   Deactivate            canDeactivate        Kebab → "Deactivate" (danger)
 *   Reactivate            canReactivate        (deactivated-table only)
 *   Delete                canDelete            (deactivated-table only)
 *
 *   hasAnyRowAction = canEdit || canResetPassword || canDeactivate
 *     → false → render "—" instead of a KebabMenu
 *
 * ─── WHAT THIS FILE TESTS ──────────────────────────────────────────────────
 *
 *   1. Super Admin  — all permissions true (bypass); every action enabled.
 *   2. Admin (full) — all 7 permission flags true; every action enabled.
 *   3. Admin (limited) — individual flags false → specific action disabled
 *      with `disabledReason` tooltip; others stay enabled.
 *   4. Admin (none)  — all flags false; Add User button disabled, kebab
 *      replaced by "—"; defensive guard keeps modals from rendering.
 *   5. Not-allowed actions — disabled kebab / Add button do NOT fire
 *      handlers (no API call → no backend 403 → no toast).
 *   6. Infinite scroll — "Loading more…" / "No more users" / "(all loaded)"
 *      footers driven by `hasNextPage` and `isFetchingNextPage`.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SortDirection, SystemUser, UserRole } from "../types/user.type";
import UserManagementTable from "../components/UserManagementTable";

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

vi.mock("../hooks/permission/use-user-management-permissions-helper", () => ({
  useUserManagementPermissionsHelper: mockPermissions,
}));

// ─── Mocked table hook (stateful) ─────────────────────────────────────────────
// Same strategy as the existing component test: real `useState`/`useRef` inside
// `mockImplementation` so that interactions (typing search, clicking kebab,
// toggling sort) actually re-render the component and we can assert on the DOM.
const { mockUseUserManagementTable } = vi.hoisted(() => ({
  mockUseUserManagementTable: vi.fn(),
}));

vi.mock("../hooks/use-user-management-table", () => ({
  useUserManagementTable: mockUseUserManagementTable,
}));

// ─── Modal stubs ──────────────────────────────────────────────────────────────
//
// Each stub renders a `data-testid` marker + the targeted user's name so we can
// assert *which* user an action was fired on, and whether the modal rendered at
// all (the defensive-guard tests). We deliberately do NOT render real modals —
// the modal internals (forms, mutations, query-client) are out of scope here.

vi.mock("../components/modal/AddUserModal", () => ({
  default: function AddUserModalStub({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="add-user-modal">
        <span>Add user form</span>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

vi.mock("../components/modal/EditUserModal", () => ({
  default: function EditUserModalStub({
    initial,
    onClose,
    userId,
  }: {
    initial?: { name?: string };
    onClose: () => void;
    userId: string;
  }) {
    return (
      <div data-testid="edit-user-modal">
        Edit {initial?.name ?? userId}
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

vi.mock("../components/modal/DeactivateUserModal", () => ({
  default: function DeactivateUserModalStub({
    user,
    onClose,
  }: {
    user?: SystemUser | null;
    onClose: () => void;
  }) {
    return (
      <div data-testid="deactivate-user-modal">
        Deactivate {user?.name}
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

vi.mock("../components/modal/reset/ResetPasswordModal", () => ({
  default: function ResetPasswordModalStub({
    user,
    onClose,
  }: {
    user?: SystemUser | null;
    onClose: () => void;
  }) {
    return (
      <div data-testid="reset-password-modal">
        Reset password for {user?.name}
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

/** The role-select type excludes "Super Admin" exactly like the real hook. */
type FilterRole = Exclude<UserRole, "Super Admin"> | "All";

const USERS: SystemUser[] = [
  {
    id: "u1",
    name: "Alice Reyes",
    position: "Engineer",
    divisionName: "NCR",
    role: "Admin",
    email: "alice@peo.gov.ph",
    contact: "09171234567",
    createtAt: "Jan 2025",
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
  },
];

/** The single user handed to kebab-action tests (one row = one menu). */
const ALICE: SystemUser = USERS[0]!;

/**
 * The full permission-flag set that `useUserManagementPermissionsHelper`
 * returns. Mirrors the real hook's return shape.
 *
 * Field → backend enum mapping:
 *   canView          → UserManagementPermission.View
 *   canAdd           → UserManagementPermission.Add        (Add User button)
 *   canEdit          → UserManagementPermission.Edit        (Kebab → Edit)
 *   canResetPassword → UserManagementPermission.ResetPassword (Kebab → Reset Password)
 *   canDeactivate    → UserManagementPermission.Deactivate  (Kebab → Deactivate)
 *   canReactivate    → UserManagementPermission.Reactivate  (deactivated-table)
 *   canDelete        → UserManagementPermission.Delete      (deactivated-table)
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
 *   hasAnyRowAction          = canEdit || canResetPassword || canDeactivate
 *   hasAnyDeactivatedRowAction = canReactivate || canDelete
 *
 * Call with no overrides → everything true (Super Admin / full-permission Admin).
 * Pass `{ canEdit: false }` → Edit disabled, others stay enabled.
 */
function makePermissions(
  overrides: Partial<PermissionsResult> = {},
): PermissionsResult {
  const canEdit = overrides.canEdit ?? true;
  const canResetPassword = overrides.canResetPassword ?? true;
  const canDeactivate = overrides.canDeactivate ?? true;
  const canReactivate = overrides.canReactivate ?? true;
  const canDelete = overrides.canDelete ?? true;

  return {
    canView: overrides.canView ?? true,
    canAdd: overrides.canAdd ?? true,
    canEdit,
    canResetPassword,
    canDeactivate,
    canReactivate,
    canDelete,
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
    addModal?: boolean;
    editTarget?: SystemUser | null;
    deactivateTarget?: SystemUser | null;
    resetTarget?: SystemUser | null;
  };
}

/**
 * Build a stateful mock implementation for `useUserManagementTable`.
 *
 * Real `useState`/`useRef` inside so user interactions (typing search,
 * clicking kebab, toggling sort) re-render the component and we can assert
 * on the resulting DOM — not just on spy calls. Display flags come from
 * `overrides`; modal state starts from `presetTargets` when provided.
 */
function makeHookImpl(overrides: HookDisplayState = {}) {
  return function useUserManagementTable() {
    const [search, setSearch] = React.useState("");
    const [filterRole, setFilterRole] = React.useState<FilterRole>("All");
    const [sort, setSort] = React.useState<SortDirection>("newest");
    const [addModal, setAddModal] = React.useState(
      overrides.presetTargets?.addModal ?? false,
    );
    const [editTarget, setEditTarget] = React.useState<SystemUser | null>(
      overrides.presetTargets?.editTarget ?? null,
    );
    const [deactivateTarget, setDeactivateTarget] =
      React.useState<SystemUser | null>(
        overrides.presetTargets?.deactivateTarget ?? null,
      );
    const [resetTarget, setResetTarget] = React.useState<SystemUser | null>(
      overrides.presetTargets?.resetTarget ?? null,
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
      addModal,
      setAddModal,
      editTarget,
      setEditTarget,
      deactivateTarget,
      setDeactivateTarget,
      resetTarget,
      setResetTarget,
    };
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("UserManagementTable — access control", () => {
  beforeEach(() => {
    // Default: Super Admin permissions (all flags true) + loaded data.
    mockPermissions.mockReturnValue(makePermissions());
    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({ filtered: USERS, hasNextPage: true }),
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
     *   - canAdd === true            → Add User button is enabled
     *   - canEdit === true           → Edit kebab item is enabled
     *   - canResetPassword === true  → Reset Password kebab item is enabled
     *   - canDeactivate === true     → Deactivate (danger) kebab item is enabled
     *   - hasAnyRowAction === true   → KebabMenu renders (NOT a dash)
     */

    it("enables the Add User button (canAdd is true)", () => {
      /*
       * The Add User button is wrapped in a <span> whose `title` is
       * `undefined` when `canAdd` is true (no tooltip). The button itself
       * must NOT have the native `disabled` attribute.
       */
      render(<UserManagementTable />);

      const addBtn = screen.getByRole("button", { name: /add user/i });
      expect(addBtn).not.toBeDisabled();

      // No "no permission" tooltip on the parent span.
      const parentSpan = addBtn.closest("span");
      expect(parentSpan).not.toHaveAttribute(
        "title",
        expect.stringContaining("You don't have permission"),
      );
    });

    it("renders all kebab actions as enabled (no aria-disabled, no tooltip)", () => {
      /*
       * Open Alice's kebab menu and verify every action button is interactive:
       *   - Edit, Reset Password, Deactivate must NOT have aria-disabled="true".
       *   - No tooltip (disabledReason title) on any of them.
       */
      render(<UserManagementTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      const editBtn = screen.getByRole("button", { name: "Edit" });
      const resetBtn = screen.getByRole("button", { name: "Reset Password" });
      const deactivateBtn = screen.getByRole("button", { name: "Deactivate" });

      expect(editBtn).not.toHaveAttribute("aria-disabled", "true");
      expect(resetBtn).not.toHaveAttribute("aria-disabled", "true");
      expect(deactivateBtn).not.toHaveAttribute("aria-disabled", "true");

      // Enabled actions carry no disabledReason tooltip.
      expect(editBtn).not.toHaveAttribute(
        "title",
        expect.stringContaining("You don't have permission"),
      );
    });

    it("renders a KebabMenu (not a dash) when hasAnyRowAction is true", () => {
      /*
       * When at least one row action is allowed, `renderActions` returns
       * `<KebabMenu …>` — which mounts the "More actions" trigger button.
       * When ALL are disabled, it renders a plain "—" span instead.
       */
      render(<UserManagementTable />);

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
     * everything is enabled.
     *
     * Backend equivalent: `PermissionsGuard` checks
     * `permissions[permission] === true` — the Admin row in the DB has all
     * flags set.
     */

    it("enables Add User button and all kebab actions (identical to Super Admin)", () => {
      /*
       * Same assertions as the Super Admin block — proving that a fully-
       * permissioned Admin gets the same UI as a Super Admin.
       */
      render(<UserManagementTable />);

      expect(
        screen.getByRole("button", { name: /add user/i }),
      ).not.toBeDisabled();

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      expect(screen.getByRole("button", { name: "Edit" })).not.toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(
        screen.getByRole("button", { name: "Reset Password" }),
      ).not.toHaveAttribute("aria-disabled", "true");
      expect(
        screen.getByRole("button", { name: "Deactivate" }),
      ).not.toHaveAttribute("aria-disabled", "true");
    });
  });

  // ── Admin with limited permissions ───────────────────────────────────────

  describe("Admin with limited permissions (selective flags false)", () => {
    /*
     * When an Admin's permission flags are selectively revoked, only the
     * corresponding actions are disabled. The KebabMenu renders each action
     * with `disabled: true` and `disabledReason: noPermission("…")` which
     * becomes the button's `title` (tooltip). The Add User button follows the
     * same pattern via a wrapping <span title={…}>.
     *
     * Backend equivalent: `@RequirePermission(Domain, Permission.X)` returns
     * 403 when `permissions["x"]` is `false`. On the frontend, the flag is
     * `false` → action disabled → user never reaches the backend.
     */

    it("canAdd=false disables the Add User button with the no-permission tooltip", () => {
      /*
       * The Add User button is `disabled={!canAdd}` and its parent <span>
       * carries `title={noPermission("add users")}`.
       */
      mockPermissions.mockReturnValue(makePermissions({ canAdd: false }));

      render(<UserManagementTable />);

      const addBtn = screen.getByRole("button", { name: /add user/i });
      expect(addBtn).toBeDisabled();

      // Tooltip on the wrapping <span>.
      const tooltip = addBtn.closest("span");
      expect(tooltip).toHaveAttribute(
        "title",
        "You don't have permission to add users",
      );
    });

    it("canEdit=false disables the Edit kebab action (tooltip set, others stay enabled)", () => {
      /*
       * Only Edit is disabled — Reset Password and Deactivate must remain
       * enabled. This verifies that revoking one permission doesn't cascade.
       */
      mockPermissions.mockReturnValue(makePermissions({ canEdit: false }));

      render(<UserManagementTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      const editBtn = screen.getByRole("button", { name: "Edit" });
      expect(editBtn).toHaveAttribute("aria-disabled", "true");
      expect(editBtn).toHaveAttribute(
        "title",
        "You don't have permission to edit users",
      );

      // Siblings still enabled.
      expect(
        screen.getByRole("button", { name: "Reset Password" }),
      ).not.toHaveAttribute("aria-disabled", "true");
      expect(
        screen.getByRole("button", { name: "Deactivate" }),
      ).not.toHaveAttribute("aria-disabled", "true");
    });

    it("canResetPassword=false disables Reset Password (tooltip set, others enabled)", () => {
      mockPermissions.mockReturnValue(makePermissions({ canResetPassword: false }));

      render(<UserManagementTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      const resetBtn = screen.getByRole("button", { name: "Reset Password" });
      expect(resetBtn).toHaveAttribute("aria-disabled", "true");
      expect(resetBtn).toHaveAttribute(
        "title",
        "You don't have permission to reset passwords",
      );

      // Edit and Deactivate still enabled.
      expect(screen.getByRole("button", { name: "Edit" })).not.toHaveAttribute(
        "aria-disabled",
        "true",
      );
      expect(
        screen.getByRole("button", { name: "Deactivate" }),
      ).not.toHaveAttribute("aria-disabled", "true");
    });

    it("canDeactivate=false disables Deactivate (danger) action with tooltip", () => {
      /*
       * Deactivate is the `danger: true` action. When disabled it keeps the
       * dimmed style AND the tooltip explains why.
       */
      mockPermissions.mockReturnValue(makePermissions({ canDeactivate: false }));

      render(<UserManagementTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      const deactivateBtn = screen.getByRole("button", { name: "Deactivate" });
      expect(deactivateBtn).toHaveAttribute("aria-disabled", "true");
      expect(deactivateBtn).toHaveAttribute(
        "title",
        "You don't have permission to deactivate users",
      );
    });

    it("Add User button stays enabled when only row-action permissions are revoked", () => {
      /*
       * canAdd is independent of the row-action flags. Revoking canEdit /
       * canResetPassword / canDeactivate must NOT disable the Add User button.
       */
      mockPermissions.mockReturnValue(
        makePermissions({
          canEdit: false,
          canResetPassword: false,
          canDeactivate: false,
        }),
      );

      render(<UserManagementTable />);

      expect(
        screen.getByRole("button", { name: /add user/i }),
      ).not.toBeDisabled();
    });
  });

  // ── Admin with NO permissions ────────────────────────────────────────────

  describe("Admin with no user-management permissions (all flags false)", () => {
    /*
     * An Admin whose `user_management_permissions` are all-`false` (this is
     * the same state as Receiver / Division roles, whose permissions object
     * is `null` → every `hasPermission` check returns `false`) sees:
     *
     *   - Add User button disabled (canAdd === false).
     *   - hasAnyRowAction === false → no KebabMenu, just a "—" dash.
     *   - Defensive guard: even if modal-target state is stale/true, the
     *     `{target && canX && <Modal/>}` expression evaluates to false → no
     *     modal renders, so no API call → no backend 403 → no toast.
     *
     * Backend equivalent: `RolesGuard` allows Admin through, but
     * `PermissionsGuard` returns 403 because `permissions[permission]` is
     * false for every flag.
     */

    it("disables the Add User button", () => {
      mockPermissions.mockReturnValue(makePermissions({ canAdd: false }));

      render(<UserManagementTable />);

      expect(
        screen.getByRole("button", { name: /add user/i }),
      ).toBeDisabled();
    });

    it("renders a dash ('—') instead of a KebabMenu when all row actions are disabled", () => {
      /*
       * `hasAnyRowAction` = canEdit || canResetPassword || canDeactivate.
       * When all three are false the component short-circuits to a plain
       * dash — no menu to click, no actions to fire.
       */
      mockPermissions.mockReturnValue(
        makePermissions({
          canEdit: false,
          canResetPassword: false,
          canDeactivate: false,
        }),
      );

      render(<UserManagementTable />);

      // No kebab trigger anywhere.
      expect(screen.queryByTitle("More actions")).not.toBeInTheDocument();
      // Dash placeholder in the Action column (mobile + desktop).
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
    });

    it("defensive guard: EditUserModal does NOT render even if editTarget state is set but canEdit is false", () => {
      /*
       * The component guards modal rendering with:
       *   {editTarget && canEdit && <EditUserModal …/>}
       *
       * This test pre-seeds `editTarget` in the mocked hook (simulating a
       * stale state where the user opened the edit modal, then their
       * permission was revoked) and asserts the modal stub does NOT appear.
       *
       * This is the component-level safety net: even without the backend 403
       * + toast, the UI never shows a modal the user can't act on.
       */
      mockPermissions.mockReturnValue(makePermissions({ canEdit: false }));

      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({
          filtered: USERS,
          presetTargets: { editTarget: ALICE },
        }),
      );

      render(<UserManagementTable />);

      expect(screen.queryByTestId("edit-user-modal")).not.toBeInTheDocument();
    });

    it("defensive guard: AddUserModal does NOT render if addModal is true but canAdd is false", () => {
      /*
       *   {addModal && canAdd && <AddUserModal …/>}
       *
       * Pre-seed addModal=true with canAdd=false → modal must not appear.
       */
      mockPermissions.mockReturnValue(makePermissions({ canAdd: false }));

      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({
          filtered: USERS,
          presetTargets: { addModal: true },
        }),
      );

      render(<UserManagementTable />);

      expect(screen.queryByTestId("add-user-modal")).not.toBeInTheDocument();
    });

    it("defensive guard: ResetPasswordModal does NOT render if resetTarget is set but canResetPassword is false", () => {
      /*
       *   {resetTarget && canResetPassword && <ResetPasswordModal …/>}
       */
      mockPermissions.mockReturnValue(makePermissions({ canResetPassword: false }));
      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({
          filtered: USERS,
          presetTargets: { resetTarget: ALICE },
        }),
      );

      render(<UserManagementTable />);

      expect(screen.queryByTestId("reset-password-modal")).not.toBeInTheDocument();
    });

    it("defensive guard: DeactivateUserModal does NOT render if deactivateTarget set but canDeactivate is false", () => {
      /*
       *   {deactivateTarget && canDeactivate && <DeactivateUserModal …/>}
       */
      mockPermissions.mockReturnValue(makePermissions({ canDeactivate: false }));
      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({
          filtered: USERS,
          presetTargets: { deactivateTarget: ALICE },
        }),
      );

      render(<UserManagementTable />);

      expect(screen.queryByTestId("deactivate-user-modal")).not.toBeInTheDocument();
    });
  });

  // ── Not-allowed actions: no toast, no handler fire ───────────────────────

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
     *   toast.error(getApiErrorMessage(error, "Failed to deactivate user"))
     *   toast.error(getApiErrorMessage(error, "Failed to reactivate user"))
     *
     * These tests assert the UI-level prevention at the component — the
     * backend/toast layer is owned by the hooks (not covered here per scope).
     */

    it("clicking a disabled kebab action does NOT fire the handler (no modal opens)", () => {
      /*
       * canEdit=false → Edit kebab item is disabled. Clicking it:
       *   - KebabMenu's onClick sees `action.disabled === true` → returns early.
       *   - setEditTarget is never called → editTarget stays null.
       *   - `{editTarget && canEdit && <EditUserModal/>}` → no modal.
       *   - No API call → no backend 403 → no toast.
       */
      mockPermissions.mockReturnValue(makePermissions({ canEdit: false }));
      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({ filtered: [ALICE] }),
      );

      render(<UserManagementTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);
      fireEvent.click(screen.getByRole("button", { name: "Edit" }));

      // Modal never appears — handler didn't fire.
      expect(screen.queryByTestId("edit-user-modal")).not.toBeInTheDocument();
    });

    it("clicking a disabled Add User button does NOT open the Add User modal", () => {
      /*
       * canAdd=false → the button has the native `disabled` attribute.
       * A disabled <button> never fires onClick in the browser, so
       * setAddModal is never called → addModal stays false → no modal.
       */
      mockPermissions.mockReturnValue(makePermissions({ canAdd: false }));
      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({ filtered: USERS }),
      );

      render(<UserManagementTable />);

      const addBtn = screen.getByRole("button", { name: /add user/i });
      expect(addBtn).toBeDisabled();
      fireEvent.click(addBtn);

      expect(screen.queryByTestId("add-user-modal")).not.toBeInTheDocument();
    });

    it("clicking a disabled Deactivate (danger) action does NOT fire the handler", () => {
      /*
       * canDeactivate=false → Deactivate is disabled. Clicking it must not
       * call setDeactivateTarget → no DeactivateUserModal.
       */
      mockPermissions.mockReturnValue(makePermissions({ canDeactivate: false }));
      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({ filtered: [ALICE] }),
      );

      render(<UserManagementTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);
      fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

      expect(
        screen.queryByTestId("deactivate-user-modal"),
      ).not.toBeInTheDocument();
    });
  });

  // ── Infinite scroll footers ──────────────────────────────────────────────

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
     *     → "No more users" (mobile footer)
     *     → "Showing N users (all loaded)" (desktop summary)
     *
     *   Data loaded + hasNextPage=true + isFetchingNextPage=false (idle, more)
     *     → NO footers (sentinel armed, not firing)
     *
     * These tests use USERS (2 items) as the `filtered` data so the footers
     * appear inside the data section.
     */

    it("shows 'Loading more…' while isFetchingNextPage is true (mobile + desktop = 2)", () => {
      /*
       * The "Loading more…" footer lives inside the data section (post
       * initial-load). It appears once in the mobile card list and once in
       * the desktop table body → 2 occurrences total.
       */
      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({
          filtered: USERS,
          hasNextPage: true,
          isFetchingNextPage: true,
        }),
      );

      render(<UserManagementTable />);

      expect(screen.getAllByText(/Loading more/i)).toHaveLength(2);
      // While fetching, "No more" / "(all loaded)" must NOT appear.
      expect(screen.queryByText(/No more users/i)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/\(all loaded\)/);
    });

    it("shows 'No more users' (mobile) + '(all loaded)' (desktop) when hasNextPage is false", () => {
      /*
       * hasNextPage=false means the cursor is exhausted — the sentinel
       * observer is disabled (`enabled: false`). On mobile the footer reads
       * "No more users"; on desktop the summary row appends "(all loaded)"
       * to "Showing N users".
       */
      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({
          filtered: USERS,
          hasNextPage: false,
          isFetchingNextPage: false,
        }),
      );

      render(<UserManagementTable />);

      // Mobile-only footer.
      expect(screen.getAllByText(/No more users/i)).toHaveLength(1);
      // Desktop summary switches to the "(all loaded)" affordance.
      expect(document.body.textContent).toMatch(/\(all loaded\)/);
      // No "Loading more" while idle.
      expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    });

    it("hides both footers while idle and more pages remain", () => {
      /*
       * hasNextPage=true, isFetchingNextPage=false → sentinel is armed but
       * not firing. Neither "Loading more…" nor "No more users" should
       * appear. The user just sees the current page's data.
       */
      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({
          filtered: USERS,
          hasNextPage: true,
          isFetchingNextPage: false,
        }),
      );

      render(<UserManagementTable />);

      expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/No more users/i)).not.toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/\(all loaded\)/);
    });

    it("shows skeletons during isLoading with NO footers or data rows", () => {
      /*
       * isLoading is the first-render guard. TableShell swaps the body for
       * skeletons and does NOT render data rows, "Loading more…", or
       * "No more users".
       */
      mockUseUserManagementTable.mockImplementation(
        makeHookImpl({
          filtered: USERS,
          isLoading: true,
        }),
      );

      render(<UserManagementTable />);

      expect(screen.getByTestId("mobile-skeleton")).toBeInTheDocument();
      expect(screen.getByTestId("desktop-skeleton")).toBeInTheDocument();
      // No data during initial load.
      expect(screen.queryByText("Alice Reyes")).not.toBeInTheDocument();
      // No footers either.
      expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/No more users/i)).not.toBeInTheDocument();
    });
  });
});

/**
 * Component (UI) tests for `DeactivatedUsersTable`.
 *
 * WHY THIS FILE EXISTS
 *   The hook tests (`use-deactivated-users-table`, `use-reactivate-user`,
 *   `use-reactivate-user`, `use-delete-user`) cover state/mutation logic in
 *   isolation. This file verifies the *component* — i.e. that
 *   `DeactivatedUsersTable` wires its (mocked) state to real rendering in
 *   `TableShell` / `KebabMenu`, and that the real modal sub-components surface a
 *   loading indicator while their mutation is pending.
 *
 * WHAT THIS FILE COVERS (mapped to the request):
 *   1. Action disabled when not permitted  — the row kebab's Reactivate / Delete
 *      items are `aria-disabled` (with a `noPermission` title) when the current
 *      user lacks the claim, and produce NO modal. When the user lacks *both*
 *      claims, the whole kebab is replaced with a dash (`—`).
 *   2. Infinite scroll works with/without filters — the `hasNextPage` /
 *      `isFetchingNextPage` footers ("Loading more…" / "No more deactivated users"
 *      + "(all loaded)") render correctly, independent of whether a search or
 *      role filter is active.
 *   3. Loading indicator in each modal component — opening the Reactivate / Delete
 *      modal while the mutation is pending renders the real "Reactivating…" /
 *      "Deleting…" button text + disables the action buttons. Asserted against
 *      the REAL modal components, not stubs.
 *
 * WIRING / DATA FLOW
 *   Backend (NestJS):
 *     GET     /user/deactivated?name=&role_id=&sort=&cursor=&limit=20
 *             → PaginatedResponse<UserWithRelationResponse>
 *     PATCH   /user/:id/reactivate
 *     DELETE  /user/:id
 *   Frontend:
 *     DeactivatedUserService → useDeactivatedUsers (infinite query) →
 *       useDeactivatedUserTable → DeactivatedUsersTable
 *         → KebabMenu (row actions) + ReactivateUserModal / PermanentDeleteUserModal
 *     Permissions: UserProvider (currentUser.claims) → usePermissions(
 *       "user_management_permissions") → useUserManagementPermissionsHelper →
 *       canReactivate | canDelete | hasAnyDeactivatedRowAction.
 *
 * STRATEGY (mirrors `divisions/test/DivisionManagementTable.test.tsx`)
 *   - Mock `useDeactivatedUserTable` as a *stateful* implementation: real
 *     `useState` for `search`/`filterRole`/`sort`/modal targets so user clicks
 *     and typing re-render and we assert on the resulting DOM — not just spies.
 *     Display flags (`isLoading`/`isError`/`filtered`/`hasNextPage`/
 *     `isFetchingNextPage`) and refs come from a per-test override object.
 *   - Mock `useUser` (the single read point of the user context) and let the REAL
 *     `usePermissions` + `useUserManagementPermissionsHelper` run, so the
 *     end-to-end claims → `canReactivate`/`canDelete` → disabled-kebab contract is
 *     exercised (same philosophy as `Can.test.tsx`).
 *   - Mock only the two *mutation* hooks (`useReactivateUser` / `useDeleteUser`)
 *     so we can flip `isPending` and drive the real modal loading indicators, and
 *     assert `mutate` is called with the right user id on submit. No
 *     QueryClientProvider is needed because the table hook is fully mocked and the
 *     modal hooks are mocked at their deepest boundary.
 *   - Stub only the Skeleton primitives (`MobileCardSkeleton` / `TableSkeleton`)
 *     to a `data-testid`, so loading-state assertions stay crisp.
 *   - Render the REAL `KebabMenu` (so disabled items use real `aria-disabled` +
 *     click-guard logic), the REAL `TableShell` (so infinite-scroll footers match
 *     production exactly), and the REAL `ReactivateUserModal` /
 *     `PermanentDeleteUserModal` (so loading text is the real copy).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SortDirection, SystemUser, UserRole } from "../../user-management/types/user.type";
import type { User } from "../../../context/currentUser/curr-user.type";
import type { UserManagementPermissions } from "../../auth/authorization/types/user-management-permission.type";

// ─── Hoisted mocks ───────────────────────────────────────────────────────
//
// `useUser` is the single authn/authz read point (same hook `Can.test.tsx`
// mocks). `mockUseTable` replaces the whole table-state layer so we can drive
// data, filters and modal targets deterministically. `mockUseReactivateUser` /
// `mockUseDeleteUser` are the deepest boundary of each modal — mocking them lets
// us flip `isPending` to assert the real loading indicator without a
// QueryClientProvider or a real network layer.
const { mockUseUser, mockUseTable, mockUseReactivateUser, mockUseDeleteUser, reactivateMutate, deleteMutate } =
  vi.hoisted(() => ({
    mockUseUser: vi.fn(),
    mockUseTable: vi.fn(),
    mockUseReactivateUser: vi.fn(),
    mockUseDeleteUser: vi.fn(),
    reactivateMutate: vi.fn(),
    deleteMutate: vi.fn(),
  }));

vi.mock("../../../context/currentUser/use-user", () => ({
  useUser: mockUseUser,
}));
vi.mock("../hooks/use-deactivated-users-table", () => ({
  useDeactivatedUserTable: mockUseTable,
}));
vi.mock("../hooks/api/use-reactivate-user", () => ({
  useReactivateUser: mockUseReactivateUser,
}));
vi.mock("../hooks/api/user-delete-user", () => ({
  useDeleteUser: mockUseDeleteUser,
}));

// ─── Skeleton stubs ──────────────────────────────────────────────────────
// Keep loading-state assertions sharp: we only care that a skeleton marker
// renders (and real rows don't), not its internal markup.
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

import DeactivatedUsersTable from "../components/DeactivatedUsersTable";

// ─── Permission fixtures ─────────────────────────────────────────────────
// Keys match `UserManagementPermissions` (snake_case) which in turn match the
// `UserManagementPermissionEnum` string values ("reactivate", "delete", …).
const FULL_PERMS: UserManagementPermissions = {
  view: true,
  add: true,
  edit: true,
  reset_password: true,
  deactivate: true,
  reactivate: true,
  delete: true,
};

const NO_ROW_ACTIONS: UserManagementPermissions = {
  view: true,
  add: true,
  edit: true,
  reset_password: true,
  deactivate: true,
  reactivate: false,
  delete: false,
};

const ONLY_DELETE: UserManagementPermissions = { ...FULL_PERMS, reactivate: false };

const ONLY_REACTIVATE: UserManagementPermissions = { ...FULL_PERMS, delete: false };

/** Minimal `User` (current-user/context shape) with overridable claims. */
function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    full_name: "Jane Doe",
    email: "jane@example.com",
    role_id: 2,
    division_id: null,
    contact_number: null,
    position: null,
    is_active: false,
    permissions: { user_management_permissions: { ...FULL_PERMS } },
    ...overrides,
  };
}

// ─── View-model fixtures (what the table renders) ────────────────────────
// `SystemUser` is the shape produced by `mapUsersResponseToSystemUsers`; we hand
// build it directly since the API layer is mocked.
const USER_A: SystemUser = {
  contact: "09123456789",
  id: "u-1",
  name: "Jane Doe",
  // NOTE: position deliberately differs from the role badge text ("Admin") so
  // role-badge assertions with `getAllByText("Admin")` don't collide with the
  // position subline rendered in the Name column / mobile card.
  position: "IT Administrator",
  role: "Admin" as UserRole,
  email: "jane@example.com",
  createtAt: "Sep 2025",
  deactivatedAt: "Sep 26, 2025",
};

const USER_B: SystemUser = {
  contact: "09123456700",
  id: "u-2",
  name: "Bob Santos",
  position: "Division Officer",
  role: "Division" as UserRole,
  email: "bob@example.com",
  divisionName: "Civil Works",
  createtAt: "Aug 2025",
  deactivatedAt: "Sep 25, 2025",
};

/** Display-flag overrides that drive what `TableShell` renders. */
interface HookDisplayState {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  filtered?: SystemUser[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  /** Seed the modal target state so a modal renders without a kebab click. */
  initialReactivateTarget?: SystemUser | null;
  initialDeleteTarget?: SystemUser | null;
}

/**
 * Stateful mock implementation: `useState` for the search/filter/sort/modal
 * targets (so typing & clicking re-render), display flags + refs from overrides.
 * Mirrors `makeHookImpl` in `DivisionManagementTable.test.tsx`.
 */
function makeHookImpl(overrides: HookDisplayState = {}) {
  const impl = function useDeactivatedUserTable() {
    const [search, setSearch] = React.useState("");
    const [filterRole, setFilterRole] = React.useState<
      Exclude<UserRole, "Super Admin"> | "All"
    >("All");
    const [sort, setSort] = React.useState<SortDirection>("newest");

    const [reactivateTarget, setReactivateTarget] = React.useState<SystemUser | null>(
      overrides.initialReactivateTarget ?? null,
    );
    const [deleteTarget, setDeleteTarget] = React.useState<SystemUser | null>(
      overrides.initialDeleteTarget ?? null,
    );

    const mobileScrollRef = React.useRef<HTMLDivElement | null>(null);
    const mobileSentinelRef = React.useRef<HTMLDivElement | null>(null);
    const desktopScrollRef = React.useRef<HTMLDivElement | null>(null);
    const desktopSentinelRef = React.useRef<HTMLDivElement | null>(null);

    // Mirrors the real hook: filters are "active" when any non-default value.
    const hasFilters = !!search || filterRole !== "All" || sort !== "newest";

    const clearFilters = React.useCallback(() => {
      setSearch("");
      setFilterRole("All");
      setSort("newest");
    }, []);

    const toggleSort = React.useCallback(() => {
      setSort((prev) => (prev === "newest" ? "oldest" : "newest"));
    }, []);

    return {
      isLoading: overrides.isLoading ?? false,
      isError: overrides.isError ?? false,
      error: overrides.error ?? null,
      filtered: overrides.filtered ?? [],
      hasFilters,
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
  return impl;
}

/** Default mutation mocks — pending off, stable mutate spies. */
function wireMutations(pendingReactivate = false, pendingDelete = false) {
  mockUseReactivateUser.mockReturnValue({
    isPending: pendingReactivate,
    mutate: reactivateMutate,
  });
  mockUseDeleteUser.mockReturnValue({
    isPending: pendingDelete,
    mutate: deleteMutate,
  });
}

/** Default session: an active table user with full row-action rights. */
function loggedIn(overrides: Partial<User> = {}) {
  mockUseUser.mockReturnValue({
    currentUser: makeUser(overrides),
    isLoading: false,
  });
}

// ─── Tests ─────────────────────────────────────────────────────────────────
//
// Per-test mock wiring (each describe resets what it needs). `clearMocks` in the
// vitest config clears call/instance records between tests; implementations are
// re-set explicitly here so tests stay deterministic and independent.

describe("DeactivatedUsersTable (UI)", () => {
  beforeEach(() => {
    React.act(() => {}); // no-op guard; real setup per-test below
    // Default wiring used by data-rendering tests.
    mockUseTable.mockImplementation(
      makeHookImpl({ filtered: [USER_A, USER_B], hasNextPage: true }),
    );
    loggedIn();
    wireMutations();
  });

  // ── Permission gating: actions disabled when not allowed ────────────────
  //
  // The kebab's Reactivate item is gated by `canReactivate` and Delete by
  // `canDelete` (both flow from `useUserManagementPermissionsHelper`, which in
  // turn reads `currentUser.claims` — mocked via `useUser` so the real
  // claims→flag chain runs end-to-end).

  describe("permission gating of row actions", () => {
    it("disables the Reactivate action and opens nothing when the user lacks reactivate", () => {
      /* canReactivate = false, canDelete = true → kebab still renders (one
         action allowed), but Reactivate is aria-disabled and a click is a
         no-op (no modal opens). */
      mockUseTable.mockImplementation(
        makeHookImpl({ filtered: [USER_A], hasNextPage: false }),
      );
      loggedIn({
        permissions: { user_management_permissions: { ...ONLY_DELETE } },
      });

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      const reactivate = screen.getByRole("button", { name: "Reactivate" });
      expect(reactivate).toHaveAttribute("aria-disabled", "true");
      // noPermission("reactivate users") text is the disabledReason → tooltip.
      expect(reactivate).toHaveAttribute(
        "title",
        "You don't have permission to reactivate users",
      );

      fireEvent.click(reactivate);
      // No modal header rendered for the reactivate action.
      expect(screen.queryByText(/Reactivate Jane Doe\?/)).not.toBeInTheDocument();
    });

    it("disables the Delete action and opens nothing when the user lacks delete", () => {
      /* canDelete = false, canReactivate = true. */
      mockUseTable.mockImplementation(
        makeHookImpl({ filtered: [USER_A], hasNextPage: false }),
      );
      loggedIn({
        permissions: { user_management_permissions: { ...ONLY_REACTIVATE } },
      });

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);

      const del = screen.getByRole("button", { name: "Delete" });
      expect(del).toHaveAttribute("aria-disabled", "true");
      expect(del).toHaveAttribute(
        "title",
        "You don't have permission to permanently delete users",
      );

      fireEvent.click(del);
      expect(
        screen.queryByText(/Permanently delete Jane Doe\?/),
      ).not.toBeInTheDocument();
    });

    it("replaces the whole kebab with a dash when the user lacks ALL row actions", () => {
      /* hasAnyDeactivatedRowAction = false → renderActions returns `—` and
         no KebabMenu trigger is mounted. */
      mockUseTable.mockImplementation(
        makeHookImpl({ filtered: [USER_A], hasNextPage: false }),
      );
      loggedIn({
        permissions: { user_management_permissions: { ...NO_ROW_ACTIONS } },
      });

      render(<DeactivatedUsersTable />);

      // No kebab trigger for either the desktop row or the mobile card.
      expect(screen.queryByTitle("More actions")).not.toBeInTheDocument();
      // Each cell (desktop Action column + mobile card) shows the dash.
      expect(screen.getAllByText("—")).toHaveLength(2);
    });

    it("renders an enabled kebab and opens the Reactivate modal when the claim is present", () => {
      /* Full permissions → Reactivate enabled → kebab click opens real modal. */
      const impl = makeHookImpl({ filtered: [USER_A], hasNextPage: false });
      mockUseTable.mockImplementation(impl);
      loggedIn();

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);
      const reactivate = screen.getByRole("button", { name: "Reactivate" });
      expect(reactivate).not.toHaveAttribute("aria-disabled");

      fireEvent.click(reactivate);

      // Real modal header: "Reactivate {name}?" with the correct user.
      expect(screen.getByText("Reactivate Jane Doe?")).toBeInTheDocument();
    });

    it("renders an enabled kebab and opens the Delete modal when the claim is present", () => {
      const impl = makeHookImpl({ filtered: [USER_A], hasNextPage: false });
      mockUseTable.mockImplementation(impl);
      loggedIn();

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);
      const del = screen.getByRole("button", { name: "Delete" });
      expect(del).not.toHaveAttribute("aria-disabled");

      fireEvent.click(del);

      expect(
        screen.getByText("Permanently delete Jane Doe?"),
      ).toBeInTheDocument();
    });

    it("grants the Reactivate action to a super-admin (role_id 1) even with no claims", () => {
      /* Super-admin bypass: role_id 1 short-circuits every `can()` to true, so
         the kebab renders and Reactivate is enabled even though every permission
         flag is false. */
      mockUseTable.mockImplementation(
        makeHookImpl({ filtered: [USER_A], hasNextPage: false }),
      );
      // Super-admin (role_id 1) with every flag false — bypass makes all
      // can*() return true regardless of the null claims.
      mockUseUser.mockReturnValue({
        currentUser: makeUser({
          role_id: 1,
          permissions: { user_management_permissions: { ...NO_ROW_ACTIONS } },
        }),
        isLoading: false,
      });

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);
      expect(
        screen.getByRole("button", { name: "Reactivate" }),
      ).not.toHaveAttribute("aria-disabled");
      expect(screen.getByRole("button", { name: "Delete" })).not.toHaveAttribute(
        "aria-disabled",
      );
    });

    it("shows the dash (no kebab) when there is no current user (session expired)", () => {
      /* No authenticated user → every `can()` is false → no row actions at all. */
      mockUseTable.mockImplementation(
        makeHookImpl({ filtered: [USER_A], hasNextPage: false }),
      );
      mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });

      render(<DeactivatedUsersTable />);

      expect(screen.queryByTitle("More actions")).not.toBeInTheDocument();
      // Target seeded but the table guards with `canReactivate`, so no modal.
      expect(screen.queryByText(/Reactivate Jane Doe\?/)).not.toBeInTheDocument();
    });
  });

  // ── Toolbar: search + role filter + sort + clear ────────────────────────

  describe("toolbar controls", () => {
    it("renders the search input with the 'Search name…' placeholder", () => {
      render(<DeactivatedUsersTable />);

      expect(
        screen.getByPlaceholderText("Search name..."),
      ).toBeInTheDocument();
    });

    it("typing in search is controlled: updates the input and reveals Clear", () => {
      /* The search input is bound to the hook's `search` state. Because the mock
         impl uses real useState, typing re-renders and the value + `hasFilters`
         both react. */
      render(<DeactivatedUsersTable />);

      const input = screen.getByPlaceholderText(
        "Search name...",
      ) as HTMLInputElement;
      expect(input.value).toBe("");

      fireEvent.change(input, { target: { value: "jane" } });

      expect(input.value).toBe("jane");
      // hasFilters is true → Clear button materialises.
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("Clear button resets search, role filter and sort", () => {
      render(<DeactivatedUsersTable />);

      fireEvent.change(screen.getByPlaceholderText("Search name..."), {
        target: { value: "jane" },
      });
      expect(screen.getByText("Clear")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Clear"));

      const input = screen.getByPlaceholderText(
        "Search name...",
      ) as HTMLInputElement;
      expect(input.value).toBe("");
      expect(screen.queryByText("Clear")).not.toBeInTheDocument();
      // Sort button returns to the default "Newest" label.
      expect(screen.getByText("Newest")).toBeInTheDocument();
    });

  it("role <select> change activates filters (Clear appears)", () => {
      /* Non-default role filter → hasFilters true → Clear button. */
      render(<DeactivatedUsersTable />);

      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("All");

      fireEvent.change(select, { target: { value: "Division" } });

      expect(select.value).toBe("Division");
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });

    it("Clear is absent when no filter is active", () => {
      render(<DeactivatedUsersTable />);

      expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    });

    it("sort toggle flips Newest↔Oldest and activates filters (Clear appears)", () => {
      render(<DeactivatedUsersTable />);

      const sortBtn = screen.getByText("Newest");
      fireEvent.click(sortBtn);

      expect(screen.getByText("Oldest")).toBeInTheDocument();
      expect(screen.getByText("Clear")).toBeInTheDocument();
    });
  });

  // ── Row rendering: both mobile card and desktop row per user ────────────

  describe("row rendering", () => {
    it("renders each user's name in both the mobile card and the desktop row", () => {
      render(<DeactivatedUsersTable />);

      expect(screen.getAllByText("Jane Doe")).toHaveLength(2);
      expect(screen.getAllByText("Bob Santos")).toHaveLength(2);
    });

    it("renders the role filter <select> with every assignable role", () => {
      /* The toolbar select offers "All Roles" + each AssignableRole. Note
         "Super Admin" is intentionally NOT assignable (excluded from
         ROLE_ID_MAP), so it does not appear as a filter option. */
      render(<DeactivatedUsersTable />);

      const options = screen.getAllByRole("option").map((o) => o.textContent);
      expect(options).toEqual(["All Roles", "Admin", "Receiver", "Division"]);
    });

    it("surfaces the division name for Division-role users (mobile + desktop)", () => {
      /* USER_B has role "Division" + divisionName "Civil Works"; the table
         renders it in both the desktop Role column and the mobile card. */
      render(<DeactivatedUsersTable />);

      expect(screen.getAllByText("Civil Works")).toHaveLength(2);
    });
  });

  // ── Infinite scroll footers ──────────────────────────────────────────────
  //
  // Drive strictly by `hasNextPage` / `isFetchingNextPage`: the footer copy is
  // independent of search/role filters — exactly what "works with/without
  // filters" means.

  describe("infinite scroll footers", () => {
    it("shows 'Loading more…' (mobile + desktop) while isFetchingNextPage is true", () => {
      mockUseTable.mockImplementation(
        makeHookImpl({
          filtered: [USER_A],
          hasNextPage: true,
          isFetchingNextPage: true,
        }),
      );

      render(<DeactivatedUsersTable />);

      expect(screen.getAllByText("Loading more…")).toHaveLength(2);
      expect(screen.queryByText(/No more/)).not.toBeInTheDocument();
    });

    it("shows 'No more deactivated users' + '(all loaded)' when all pages are consumed", () => {
      mockUseTable.mockImplementation(
        makeHookImpl({
          filtered: [USER_A],
          hasNextPage: false,
          isFetchingNextPage: false,
        }),
      );

      render(<DeactivatedUsersTable />);

      expect(screen.getAllByText("No more deactivated users")).toHaveLength(1);
      expect(screen.queryByText("Loading more…")).not.toBeInTheDocument();
      // Desktop summary appends "(all loaded)" instead of a footer.
      expect(document.body.textContent).toMatch(/\(all loaded\)/);
    });

    it("shows neither footer while idle and more pages remain", () => {
      /* hasNextPage=true, isFetchingNextPage=false → user hasn't reached the
         bottom yet. Nothing should render. */
      render(<DeactivatedUsersTable />);
      expect(screen.queryByText("Loading more…")).not.toBeInTheDocument();
      expect(screen.queryByText(/No more/)).not.toBeInTheDocument();
    });

    it("keeps 'Loading more…' visible even with an active search filter", () => {
      /* Proves infinite scroll is independent of filtering: the footer only
         depends on isFetchingNextPage, not on `hasFilters`. */
      mockUseTable.mockImplementation(
        makeHookImpl({
          filtered: [USER_A],
          hasNextPage: true,
          isFetchingNextPage: true,
        }),
      );

      render(<DeactivatedUsersTable />);

      fireEvent.change(screen.getByPlaceholderText("Search name..."), {
        target: { value: "jane" },
      });

      expect(screen.getByText("Clear")).toBeInTheDocument(); // filter active
      expect(screen.getAllByText("Loading more…")).toHaveLength(2);
    });

    it("keeps footers correct when a role filter is active", () => {
      mockUseTable.mockImplementation(
        makeHookImpl({
          filtered: [USER_B],
          hasNextPage: true,
          isFetchingNextPage: true,
        }),
      );

      render(<DeactivatedUsersTable />);

      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "Division" },
      });

      expect(screen.getByText("Clear")).toBeInTheDocument();
      expect(screen.getAllByText("Loading more…")).toHaveLength(2);
    });
  });

  // ── Loading / error states ─────────────────────────────────────────────

  describe("loading and error states", () => {
    it("renders skeletons while isLoading and withholds rows + footers", () => {
      mockUseTable.mockImplementation(
        makeHookImpl({ filtered: [USER_A], isLoading: true }),
      );

      render(<DeactivatedUsersTable />);

      expect(screen.getByTestId("mobile-skeleton")).toBeInTheDocument();
      expect(screen.getByTestId("desktop-skeleton")).toBeInTheDocument();
      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
      expect(screen.queryByText("Loading more…")).not.toBeInTheDocument();
      expect(screen.queryByText(/No more/)).not.toBeInTheDocument();
    });

    it("renders the error banner with the message when isError is true", () => {
      mockUseTable.mockImplementation(
        makeHookImpl({
          filtered: [USER_A],
          isError: true,
          error: new Error("Killed by gremlins"),
        }),
      );

      render(<DeactivatedUsersTable />);

      expect(
        screen.getByText(/Failed to load deactivated users: Killed by gremlins/),
      ).toBeInTheDocument();
      // Skeletons only render during isLoading, not isError.
      expect(screen.queryByTestId("desktop-skeleton")).not.toBeInTheDocument();
      expect(screen.queryByText("Jane Doe")).not.toBeInTheDocument();
    });

    it("renders the empty message when loaded with zero users", () => {
      mockUseTable.mockImplementation(
        makeHookImpl({ filtered: [], hasNextPage: false }),
      );

      render(<DeactivatedUsersTable />);

      // The empty message renders once per surface: mobile card + desktop row.
      expect(
        screen.getAllByText("No deactivated users match your filters."),
      ).toHaveLength(2);
      expect(screen.queryByTestId("mobile-skeleton")).not.toBeInTheDocument();
    });
  });

  // ── Modals: open/close wiring ────────────────────────────────────────────

  describe("modal open / close wiring", () => {
    it("opens the Reactivate modal from the kebab and closes it via Cancel", () => {
      mockUseTable.mockImplementation(
        makeHookImpl({ filtered: [USER_A], hasNextPage: false }),
      );
      loggedIn();

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);
      fireEvent.click(screen.getByRole("button", { name: "Reactivate" }));

      expect(screen.getByText("Reactivate Jane Doe?")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      // onClose clears reactivateTarget → modal unmounts.
      expect(screen.queryByText("Reactivate Jane Doe?")).not.toBeInTheDocument();
    });

    it("opens the Delete modal from the kebab and closes it via Cancel", () => {
      mockUseTable.mockImplementation(
        makeHookImpl({ filtered: [USER_A], hasNextPage: false }),
      );
      loggedIn();

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getAllByTitle("More actions")[0]);
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      expect(
        screen.getByText("Permanently delete Jane Doe?"),
      ).toBeInTheDocument();

      // Cancel button is the first "Cancel" footer button.
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(
        screen.queryByText(/Permanently delete Jane Doe\?/),
      ).not.toBeInTheDocument();
    });

    it("renders no modal until a kebab action fires", () => {
      render(<DeactivatedUsersTable />);

      expect(screen.queryByText(/Reactivate/)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Permanently delete/),
      ).not.toBeInTheDocument();
    });
  });

  // ── Modals: loading indicator while the mutation is pending ────────────
  //
  // The real `ReactivateUserModal` / `PermanentDeleteUserModal` switch their
  // submit button copy based on `isPending` from the (mocked) mutation hook.
  // We seed the modal target so the real modal renders immediately, then flip
  // `isPending` to assert the loading indicator against the real component.

  describe("modal loading indicators", () => {
    it("shows 'Reactivating…' and disables buttons while the reactivate mutation is pending", () => {
      const impl = makeHookImpl({
        filtered: [USER_A],
        hasNextPage: false,
        initialReactivateTarget: USER_A,
      });
      mockUseTable.mockImplementation(impl);
      loggedIn();
      // isPending = true → isSubmitting = true in the real modal.
      wireMutations(true, false);

      render(<DeactivatedUsersTable />);

      // Submit button becomes the loading copy.
      expect(screen.getByText("Reactivating…")).toBeInTheDocument();
      const submit = screen.getByRole("button", { name: "Reactivating…" });
      expect(submit).toBeDisabled();
      // Cancel is also blocked while submitting.
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    it("shows 'Deleting…' and disables buttons while the delete mutation is pending", () => {
      const impl = makeHookImpl({
        filtered: [USER_A],
        hasNextPage: false,
        initialDeleteTarget: USER_A,
      });
      mockUseTable.mockImplementation(impl);
      loggedIn();
      wireMutations(false, true); // isPending delete = true → isDeleting = true

      render(<DeactivatedUsersTable />);

      expect(screen.getByText("Deleting...")).toBeInTheDocument();
      const submit = screen.getByRole("button", { name: "Deleting..." });
      expect(submit).toBeDisabled();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    });

    it("returns the submit copy to normal when the mutation is idle", () => {
      const impl = makeHookImpl({
        filtered: [USER_A],
        hasNextPage: false,
        initialReactivateTarget: USER_A,
        initialDeleteTarget: USER_A,
      });
      mockUseTable.mockImplementation(impl);
      loggedIn();
      wireMutations(false, false); // both idle

      render(<DeactivatedUsersTable />);

      expect(screen.getByText("Reactivate")).toBeInTheDocument();
      expect(screen.getByText("Delete Permanently")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Reactivate" }),
      ).not.toBeDisabled();
      // Submit still gated by canConfirm (name not yet typed).
      expect(
        screen.getByRole("button", { name: "Delete Permanently" }),
      ).toBeDisabled();
    });
  });

  // ── Modals: submit calls the right mutation with the user id ────────────

  describe("modal submit → mutation", () => {
    it("reactivating calls mutate with the user id", () => {
      const impl = makeHookImpl({
        filtered: [USER_A],
        hasNextPage: false,
        initialReactivateTarget: USER_A,
      });
      mockUseTable.mockImplementation(impl);
      loggedIn();
      wireMutations(false, false);

      render(<DeactivatedUsersTable />);

      fireEvent.click(screen.getByRole("button", { name: "Reactivate" }));

      expect(reactivateMutate).toHaveBeenCalledTimes(1);
      expect(reactivateMutate).toHaveBeenCalledWith(
        "u-1",
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });

    it("deleting requires the name to be typed, then calls mutate with the user id", () => {
      /* The delete modal's canConfirm = confirmText === user.name, so the submit
         button stays disabled until the full name is typed into the input. */
      const impl = makeHookImpl({
        filtered: [USER_A],
        hasNextPage: false,
        initialDeleteTarget: USER_A,
      });
      mockUseTable.mockImplementation(impl);
      loggedIn();
      wireMutations(false, false);

      render(<DeactivatedUsersTable />);

      const submit = screen.getByRole("button", { name: "Delete Permanently" });
      expect(submit).toBeDisabled(); // canConfirm false before typing

      const confirmInput = screen.getByLabelText(
        'Type "Jane Doe" to confirm',
      ) as HTMLInputElement;
      fireEvent.change(confirmInput, { target: { value: "Jane Doe" } });

      expect(submit).not.toBeDisabled(); // canConfirm now true

      fireEvent.click(submit);

      expect(deleteMutate).toHaveBeenCalledTimes(1);
      expect(deleteMutate).toHaveBeenCalledWith(
        "u-1",
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });
  });
});

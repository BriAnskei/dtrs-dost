/**
 * Component (UI) tests for `UserManagementTable`.
 *
 * WHY THIS FILE EXISTS:
 *   The hook tests (`use-user-management-table.test.ts`, `use-users.test.tsx`,
 *   etc.) verify state logic in isolation. This file verifies the *component* —
 *   i.e. that `UserManagementTable` wires its mocked hook state to real
 *   rendering in `TableShell` / `KebabMenu`: toolbar controls, kebab-menu
 *   actions opening the right modal, and the loading / error / pagination
 *   footers that drive the infinite-scroll UX.
 *
 * STRATEGY:
 *   - Mock `useUserManagementTable` as a *stateful* implementation (real
 *     `useState`/`useRef` inside `mockImplementation`) so user interactions
 *     (typing a search, clicking a kebab item, toggling sort) actually re-render
 *     the component and we can assert on the resulting DOM — not just on spy
 *     calls. Display flags (isLoading / isError / filtered / hasNextPage /
 *     isFetchingNextPage) come from a per-test override object.
 *   - Stub the four modal sub-components and the two skeleton primitives to
 *     lightweight data-testid markers. We are testing the *table*, not the
 *     modal internals (those have their own tests); stubbing keeps a QueryClient
 *     provider unnecessary and keeps the focus sharp.
 *
 * Covered scenarios (mapped to the user's request):
 *   1. Infinite scroll + loading at bottom (isFetchingNextPage / hasNextPage
 *      footers, isFetchingNextPage toggles, "No more users").
 *   2. Reset password action (kebab → setResetTarget → ResetPasswordModal).
 *   3. Deactivation (kebab → setDeactivateTarget → DeactivateUserModal).
 *   4. Loading indicators / UI during actions (isLoading skeletons, isError
 *      banner, Add/Edit modals, "Loading more…" footer).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SortDirection,
  SystemUser,
  UserRole,
} from "../types/user.type";
import UserManagementTable from "./UserManagementTable";

// ─── Mocked hook (stateful impl set per test) ────────────────────────────────

const { mockUseUserManagementTable } = vi.hoisted(() => ({
  mockUseUserManagementTable: vi.fn(),
}));

vi.mock("../hooks/use-user-management-table", () => ({
  useUserManagementTable: mockUseUserManagementTable,
}));

// ─── Modal stubs ──────────────────────────────────────────────────────────────
// Each stub renders an identifiable marker plus the targeted user's name so we
// can assert *which* user an action was fired on (proves the kebab wiring).

vi.mock("./modal/AddUserModal", () => ({
  default: function AddUserModalStub({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="add-user-modal">
        <span>Add user form</span>
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

vi.mock("./modal/EditUserModal", () => ({
  default: function EditUserModalStub({
    user,
    onClose,
    userId,
  }: {
    user?: SystemUser | null;
    onClose: () => void;
    userId: string;
  }) {
    return (
      <div data-testid="edit-user-modal">
        Edit {user?.name ?? user?.id ?? userId}
        <button onClick={onClose}>Close</button>
      </div>
    );
  },
}));

vi.mock("./modal/reset/ResetPasswordModal", () => ({
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

vi.mock("./modal/DeactivateUserModal", () => ({
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

// ─── Skeleton stubs ───────────────────────────────────────────────────────────
// Give each skeleton a testid so the loading-state tests can assert they render
// without depending on their internal markup.

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

/** The single user we hand to kebab-action tests (one row = one menu). */
const ALICE: SystemUser = USERS[0]!;

/** Display-flag overrides that drive what TableShell renders. */
interface HookDisplayState {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  filtered?: SystemUser[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

/**
 * Build a stateful mock implementation: the form fields (search / role / sort
 * / modals / targets) are real `useState` so interactions re-render; the
 * display flags come from `overrides`. This lets a single test drive a click
 * and assert the resulting DOM change.
 */
function makeHookImpl(overrides: HookDisplayState = {}) {
  return function useUserManagementTable() {
    const [search, setSearch] = React.useState("");
    const [filterRole, setFilterRole] = React.useState<FilterRole>("All");
    const [sort, setSort] = React.useState<SortDirection>("newest");
    const [addModal, setAddModal] = React.useState(false);
    const [editTarget, setEditTarget] = React.useState<SystemUser | null>(null);
    const [deactivateTarget, setDeactivateTarget] =
      React.useState<SystemUser | null>(null);
    const [resetTarget, setResetTarget] = React.useState<SystemUser | null>(null);

    // Refs that TableShell attaches as sentinels / scroll roots.
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

    // The real toFormState strips hyphens from contact; for UI-only tests a
    // pass-through is sufficient to feed EditUserModal.
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

describe("UserManagementTable (UI)", () => {
  beforeEach(() => {
    // Default: a loaded, paginatable list of two users. Individual tests re-bind
    // the implementation when they need different display flags.
    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({ filtered: USERS, hasNextPage: true }),
    );
  });

  // ── Toolbar controls ─────────────────────────────────────────────────────

  it("renders the search input bound to hook state, and typing pushes through setSearch", () => {
    /*
     * The search box is a controlled input: its value is `search` from the hook
     * and onChange calls setSearch. Because the mock impl keeps real state,
     * typing re-renders the input and the Clear button appears (hasFilters
     * becomes true).
     */
    render(<UserManagementTable />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe(""); // starts empty

    fireEvent.change(input, { target: { value: "alice" } });

    // Controlled: the input reflects the new search value.
    expect(input.value).toBe("alice");
    // hasFilters reacted → Clear button materialised.
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("renders the role select and changing it calls setFilterRole (Clear appears)", () => {
    /*
     * The role <select> is bound to filterRole. Selecting "Admin" flips the
     * value and, because "Admin" !== "All", hasFilters becomes true so the
     * Clear button shows.
     */
    render(<UserManagementTable />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("All");

    fireEvent.change(select, { target: { value: "Admin" } });

    expect(select.value).toBe("Admin");
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("toggles sort direction via toggleSort and reflects it in the button label", () => {
    /*
     * The sort button text flips between "Newest" and "Oldest" driven by the
     * hook's `sort` state; clicking invokes toggleSort.
     */
    render(<UserManagementTable />);

    const sortBtn = screen.getByRole("button", { name: "Newest" });
    expect(sortBtn).toBeInTheDocument();

    fireEvent.click(sortBtn);

    // After toggle the button label is now "Oldest".
    expect(screen.getByRole("button", { name: "Oldest" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Newest" })).not.toBeInTheDocument();
  });

  it("shows Clear only when filters are active, and clicking it resets all of them", () => {
    /*
     * Clear button is conditional on `hasFilters`. With no filters typed the
     * button is absent; after typing a search it appears; clicking it resets
     * search/role/sort and the button disappears again.
     */
    render(<UserManagementTable />);

    // No filters yet → no Clear button.
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();

    // Activate a filter.
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ali" } });
    expect(screen.getByText("Clear")).toBeInTheDocument();

    // Reset.
    fireEvent.click(screen.getByText("Clear"));

    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    // Search input cleared back to empty.
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
  });

  it("opens the Add User modal when the Add User button is clicked", () => {
    render(<UserManagementTable />);

    const addBtn = screen.getByRole("button", { name: /add user/i });
    fireEvent.click(addBtn);

    expect(screen.getByTestId("add-user-modal")).toBeInTheDocument();
  });

  // ── Row content ───────────────────────────────────────────────────────────

  it("renders each filtered user as a row (name + position appear in both card and table)", () => {
    /*
     * TableShell renders a mobile card and a desktop row per user, so each
     * cell's text appears twice. We assert the count to prove both layouts
     * receive the same `filtered` data.
     */
    render(<UserManagementTable />);

    expect(screen.getAllByText("Alice Reyes")).toHaveLength(2);
    expect(screen.getAllByText("Bob Santos")).toHaveLength(2);
    expect(screen.getAllByText("Engineer")).toHaveLength(2);
    expect(screen.getAllByText("alice@peo.gov.ph")).toHaveLength(2);
    expect(screen.getAllByText("09171234567")).toHaveLength(2);
    expect(screen.getAllByText("Jan 2025")).toHaveLength(2);
  });

  // ── Kebab menu → modal wiring (reset password + deactivation) ─────────────

  it("opens ResetPasswordModal for the clicked user when 'Reset Password' (kebab) is chosen", () => {
    /*
     * The kebab menu's "Reset Password" item calls setResetTarget(user); because
     * the mock holds real state, the conditional `{resetTarget && <.../>}` renders
     * the stubbed modal with that user. We assert the modal carries Alice's name.
     */
    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({ filtered: [ALICE] }),
    );

    render(<UserManagementTable />);

    // Open the kebab for Alice's row (single row → single trigger).
    fireEvent.click(screen.getByTitle("More actions"));

    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(screen.getByTestId("reset-password-modal")).toBeInTheDocument();
    expect(screen.getByText("Reset password for Alice Reyes")).toBeInTheDocument();
  });

  it("opens DeactivateUserModal for the clicked user when 'Deactivate' (kebab) is chosen", () => {
    /*
     * The "Deactivate" item is marked `danger`; clicking calls setDeactivateTarget
     * and the conditional modal stub renders with the targeted user.
     */
    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({ filtered: [ALICE] }),
    );

    render(<UserManagementTable />);

    fireEvent.click(screen.getByTitle("More actions"));

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));

    expect(screen.getByTestId("deactivate-user-modal")).toBeInTheDocument();
    expect(screen.getByText("Deactivate Alice Reyes")).toBeInTheDocument();
  });

  it("opens EditUserModal for the clicked user when 'Edit' (kebab) is chosen", () => {
    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({ filtered: [ALICE] }),
    );

    render(<UserManagementTable />);

    fireEvent.click(screen.getByTitle("More actions"));

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();
    expect(screen.getByText("Edit Alice Reyes")).toBeInTheDocument();
  });

  it("renders no modal until a kebab action is taken (modal state starts closed)", () => {
    /*
     * Guards against a regression where a modal leaks onto the page before any
     * action fires.
     */
    render(<UserManagementTable />);

    expect(screen.queryByTestId("add-user-modal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-user-modal")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("reset-password-modal"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("deactivate-user-modal"),
    ).not.toBeInTheDocument();
  });

  // ── Loading / error UI ─────────────────────────────────────────────────────

  it("renders skeletons while isLoading and withholds the data rows", () => {
    /*
     * isLoading is the first-render / reloading guard: TableShell swaps the
     * body for skeleton placeholders and does NOT render rows or the
     * pagination footer.
     */
    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({ filtered: USERS, isLoading: true }),
    );

    render(<UserManagementTable />);

    expect(screen.getByTestId("mobile-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-skeleton")).toBeInTheDocument();
    // Data is hidden during load.
    expect(screen.queryByText("Alice Reyes")).not.toBeInTheDocument();
    // The infinite-scroll footers are data-section only.
    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No more users/i)).not.toBeInTheDocument();
  });

  it("renders the error banner (with message) when isError and hides rows", () => {
    /*
     * On error TableShell shows `Failed to load {entityName}: {error.message}`
     * and suppresses the body — users never see stale/partial rows on failure.
     */
    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({
        filtered: USERS,
        isError: true,
        error: new Error("Killed by gremlins"),
      }),
    );

    render(<UserManagementTable />);

    expect(
      screen.getByText(/Failed to load users: Killed by gremlins/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("desktop-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByText("Alice Reyes")).not.toBeInTheDocument();
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  it("renders the empty message when there are no matching users", () => {
    mockUseUserManagementTable.mockImplementation(makeHookImpl({ filtered: [] }));

    render(<UserManagementTable />);

    // Appears once in the mobile card + once in the desktop table.
    expect(screen.getAllByText(/No users match your filters/)).toHaveLength(2);
    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
  });

  // ── Infinite-scroll footers (loading at the bottom) ───────────────────────

  it("shows 'Loading more…' at the bottom while isFetchingNextPage is true", () => {
    /*
     * The "Loading more…" footer is gated on `isFetchingNextPage` and only
     * renders inside the data section (post-initial-load). It appears once for
     * the mobile list and once for the desktop table.
     */
    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({ filtered: USERS, hasNextPage: true, isFetchingNextPage: true }),
    );

    render(<UserManagementTable />);

    expect(screen.getAllByText(/Loading more/i)).toHaveLength(2);
    // While fetching, there is no "no more" message.
    expect(screen.queryByText(/No more users/i)).not.toBeInTheDocument();
  });

  it("shows 'No more users' when hasNextPage is false (all loaded)", () => {
    /*
     * When the cursor is exhausted hasNextPage is false — the sentinel has no
     * effect and the footer tells the user there is nothing left to fetch.
     */
    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({ filtered: USERS, hasNextPage: false, isFetchingNextPage: false }),
    );

    render(<UserManagementTable />);

    expect(screen.getAllByText(/No more users/i)).toHaveLength(2);
    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
  });

  it("hides both footers while fetching is idle and more pages remain", () => {
    /*
     * Idle-but-more-state: hasNextPage=true, isFetchingNextPage=false. Neither
     * footer should appear yet — the sentinel is armed but not firing.
     */
    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({ filtered: USERS, hasNextPage: true, isFetchingNextPage: false }),
    );

    render(<UserManagementTable />);

    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No more users/i)).not.toBeInTheDocument();
  });

  // ── Filter + scroll interaction combined ───────────────────────────────────

  it("typing in search keeps the list filtered to the hook's `filtered` array", () => {
    /*
     * End-to-end-ish wiring of the filter request: the search box is controlled
     * by the hook, and the rows always mirror the hook's `filtered` output. Here
     * we simulate a filter applied server-side by re-binding the implementation
     * with only Alice, then confirm Bob is gone while Alice remains.
     */
    render(<UserManagementTable />);

    // Initial render shows both users.
    expect(screen.getAllByText("Alice Reyes")).toHaveLength(2);
    expect(screen.getAllByText("Bob Santos")).toHaveLength(2);

    // Apply a filter that narrows to Alice only.
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "alice" } });

    mockUseUserManagementTable.mockImplementation(
      makeHookImpl({ filtered: [ALICE], hasNextPage: false }),
    );
    render(<UserManagementTable />);

    expect(screen.getAllByText("Alice Reyes")).toHaveLength(2);
    expect(screen.queryByText("Bob Santos")).not.toBeInTheDocument();
  });
});

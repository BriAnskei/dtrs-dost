/**
 * Component (UI) tests for `DeactivatedUsersTable`.
 *
 * WHY THIS FILE EXISTS:
 *   The hook test `use-deactivated-users-table` is absent; even if it existed it
 *   would only cover state logic in isolation. This file verifies the *component*
 *   — i.e. that `DeactivatedUsersTable` wires its mocked hook state to real
 *   rendering in `TableShell` / `KebabMenu`: toolbar controls, kebab-menu
 *   actions opening the right modal, and the loading / error / pagination
 *   footers that drive the infinite-scroll UX for the deactivated-accounts view.
 *
 * STRATEGY (mirrors `UserManagementTable.test.tsx`):
 *   - Mock `useDeactivatedUserTable` as a *stateful* implementation (real
 *     `useState`/`useRef` inside `mockImplementation`) so user interactions
 *     (typing a search, clicking a kebab item, toggling sort) actually re-render
 *     the component and we can assert on the resulting DOM — not just on spy
 *     calls. Display flags (isLoading / isError / filtered / hasNextPage /
 *     isFetchingNextPage) come from a per-test override object.
 *   - Stub the two modal sub-components (`ReactivateUserModal`,
 *     `PermanentDeleteUserModal`) and the two skeleton primitives as
 *     lightweight `data-testid` markers. We are testing the *table*, not the
 *     modal internals (those have their own tests); stubbing avoids needing a
 *     `QueryClientProvider` and keeps the focus sharp.
 *
 * Covered scenarios:
 *   1. Infinite scroll + loading at bottom ("Loading more…" / "No more" / idle).
 *   2. Reactivate action (kebab → setReactivateTarget → ReactivateUserModal).
 *   3. Permanent-delete action (kebab → setDeleteTarget → PermanentDeleteUserModal).
 *   4. Loading indicators / UI during actions (isLoading skeletons, isError
 *      banner, "Loading more…" footer, "No more deactivated users" footer).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SortDirection,
  SystemUser,
  UserRole,
} from "../../user-management/types/user.type";
import DeactivatedUsersTable from "./DeactivatedUsersTable";

// ─── Mocked hook (stateful impl set per test) ─────────────────────────────────

const { mockUseDeactivatedUserTable } = vi.hoisted(() => ({
  mockUseDeactivatedUserTable: vi.fn(),
}));

vi.mock("../hooks/use-deactivated-users-table", () => ({
  useDeactivatedUserTable: mockUseDeactivatedUserTable,
}));

// ─── Modal stubs ─────────────────────────────────────────────────────────────
// Each stub renders an identifiable marker plus the targeted user's name so we
// can assert *which* user an action was fired on (proves the kebab wiring).

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
    onConfirm,
  }: {
    user?: SystemUser | null;
    onClose: () => void;
    onConfirm?: () => void;
  }) {
    return (
      <div data-testid="permanent-delete-user-modal">
        Delete {user?.name}
        <button onClick={onClose}>Close</button>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    );
  },
}));

// ─── Skeleton stubs ──────────────────────────────────────────────────────────
// Give each skeleton a testid so loading-state tests can assert they render
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
    // The column this table shows (createdAt is NOT rendered here).
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

/** The single user we hand to kebab-action tests (one row = one menu). */
const ALICE: SystemUser = DEACTIVATED_USERS[0]!;

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
 * Build a stateful mock implementation: the form fields (search / role / sort /
 * modal targets) are real `useState` so interactions re-render; the display
 * flags come from `overrides`. This lets a single test drive a click and assert
 * the resulting DOM change.
 */
function makeHookImpl(overrides: HookDisplayState = {}) {
  return function useDeactivatedUserTable() {
    const [search, setSearch] = React.useState("");
    const [filterRole, setFilterRole] = React.useState<FilterRole>("All");
    const [sort, setSort] = React.useState<SortDirection>("newest");
    const [reactivateTarget, setReactivateTarget] =
      React.useState<SystemUser | null>(null);
    const [deleteTarget, setDeleteTarget] = React.useState<SystemUser | null>(
      null,
    );

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
      // The component destructures `deleteUser` for the modal's onConfirm; the
      // stub gives it a no-op fn (never invoked in these UI-only tests).
      deleteUser: vi.fn(),
    };
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DeactivatedUsersTable (UI)", () => {
  beforeEach(() => {
    // Default: a loaded, paginatable list of two deactivated users. Individual
    // tests re-bind the implementation when they need different display flags.
    mockUseDeactivatedUserTable.mockImplementation(
      makeHookImpl({ filtered: DEACTIVATED_USERS, hasNextPage: true }),
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
    render(<DeactivatedUsersTable />);

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
    render(<DeactivatedUsersTable />);

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
    render(<DeactivatedUsersTable />);

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
    render(<DeactivatedUsersTable />);

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

  // ── Row content ───────────────────────────────────────────────────────────

  it("renders each filtered user as a row (name, email, role-division and deactivatedAt appear in both card and table)", () => {
    /*
     * TableShell renders a mobile card and a desktop row per user, so each
     * cell's text appears twice. The role "Division" also surfaces
     * `divisionName` ("NCR") in both layouts — asserting that count proves the
     * role-conditional branch renders.
     */
    render(<DeactivatedUsersTable />);

    expect(screen.getAllByText("Alice Reyes")).toHaveLength(2);
    expect(screen.getAllByText("Bob Santos")).toHaveLength(2);
    expect(screen.getAllByText("alice@peo.gov.ph")).toHaveLength(2);
    // "NCR" only renders for Alice (role === "Division") — twice (card + row).
    expect(screen.getAllByText("NCR")).toHaveLength(2);
    // deactivatedAt renders in both the mobile card and the desktop column.
    expect(screen.getAllByText("Feb 2025")).toHaveLength(2);
  });

  // ── Kebab menu → modal wiring (reactivate + permanent delete) ──────────────

  /*
   * Each row mounts TWO kebabs — one inside the mobile card and one in the
   * desktop <Action> column — so `getAllByTitle("More actions")` returns both;
   * we open the first one. Both kebabs share the same per-user actions.
   */

  it("opens ReactivateUserModal for the clicked user when 'Reactivate' (kebab) is chosen", () => {
    /*
     * The kebab menu's "Reactivate" item calls setReactivateTarget(user); because
     * the mock holds real state, the conditional `{reactivateTarget && <…/>}`
     * renders the stubbed modal with that user. We assert the modal carries
     * Alice's name.
     */
    mockUseDeactivatedUserTable.mockImplementation(
      makeHookImpl({ filtered: [ALICE] }),
    );

    render(<DeactivatedUsersTable />);

    // Open the kebab for Alice's row (mobile card + desktop row = two triggers).
    fireEvent.click(screen.getAllByTitle("More actions")[0]);

    fireEvent.click(screen.getByRole("button", { name: "Reactivate" }));

    expect(screen.getByTestId("reactivate-user-modal")).toBeInTheDocument();
    expect(screen.getByText("Reactivate Alice Reyes")).toBeInTheDocument();
  });

  it("opens PermanentDeleteUserModal for the clicked user when 'Delete' (kebab) is chosen", () => {
    /*
     * The "Delete" item is marked `danger`; clicking calls setDeleteTarget and
     * the conditional modal stub renders with the targeted user.
     */
    mockUseDeactivatedUserTable.mockImplementation(
      makeHookImpl({ filtered: [ALICE] }),
    );

    render(<DeactivatedUsersTable />);

    fireEvent.click(screen.getAllByTitle("More actions")[0]);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByTestId("permanent-delete-user-modal")).toBeInTheDocument();
    expect(screen.getByText("Delete Alice Reyes")).toBeInTheDocument();
  });

  it("renders no modal until a kebab action is taken (modal state starts closed)", () => {
    /*
     * Guards against a regression where a modal leaks onto the page before any
     * action fires.
     */
    render(<DeactivatedUsersTable />);

    expect(screen.queryByTestId("reactivate-user-modal")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("permanent-delete-user-modal"),
    ).not.toBeInTheDocument();
  });

  // ── Loading / error UI ─────────────────────────────────────────────────────

  it("renders skeletons while isLoading and withholds the data rows", () => {
    /*
     * isLoading is the first-render / reloading guard: TableShell swaps the
     * body for skeleton placeholders and does NOT render rows or the
     * pagination footer.
     */
    mockUseDeactivatedUserTable.mockImplementation(
      makeHookImpl({ filtered: DEACTIVATED_USERS, isLoading: true }),
    );

    render(<DeactivatedUsersTable />);

    expect(screen.getByTestId("mobile-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-skeleton")).toBeInTheDocument();
    // Data is hidden during load.
    expect(screen.queryByText("Alice Reyes")).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No more/i)).not.toBeInTheDocument();
  });

  it("renders the error banner (with message) when isError and hides rows", () => {
    /*
     * On error TableShell shows `Failed to load {entityName}: {error.message}`
     * and suppresses the body — users never see stale/partial rows on failure.
     */
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

  // ── Empty state ────────────────────────────────────────────────────────────

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

  // ── Infinite-scroll footers (loading at the bottom) ────────────────────────

  it("shows 'Loading more…' at the bottom while isFetchingNextPage is true", () => {
    /*
     * The "Loading more…" footer is gated on `isFetchingNextPage` and only
     * renders inside the data section (post-initial-load). It appears once for
     * the mobile list and once for the desktop table.
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
    // While fetching, there is no "no more" message.
    expect(screen.queryByText(/No more/i)).not.toBeInTheDocument();
  });

  it("shows 'No more deactivated users' when hasNextPage is false (all loaded)", () => {
    /*
     * When the cursor is exhausted hasNextPage is false — the sentinel has no
     * effect. On mobile the footer reads "No more deactivated users"; on desktop
     * TableShell never renders "No more" — instead the summary row appends
     * "(all loaded)" to "Showing N deactivated users".
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
    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    // Desktop summary switches to the "(all loaded)" affordance instead.
    expect(document.body.textContent).toMatch(/\(all loaded\)/);
  });

  it("hides both footers while fetching is idle and more pages remain", () => {
    /*
     * Idle-but-more-state: hasNextPage=true, isFetchingNextPage=false. Neither
     * footer should appear yet — the sentinel is armed but not firing.
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
  });

  // ── Filter + scroll interaction combined ───────────────────────────────────

  it("typing in search keeps the list filtered to the hook's `filtered` array", () => {
    /*
     * End-to-end-ish wiring of the filter request: the search box is controlled
     * by the hook, and the rows always mirror the hook's `filtered` output. Here
     * we simulate a filter applied server-side by re-binding the implementation
     * with only Alice, then confirm Bob is gone while Alice remains.
     */
    const { rerender } = render(<DeactivatedUsersTable />);

    // Initial render shows both users.
    expect(screen.getAllByText("Alice Reyes")).toHaveLength(2);
    expect(screen.getAllByText("Bob Santos")).toHaveLength(2);

    // Drive the controlled search box (re-render with real hook state).
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "alice" } });

    // Apply a filter that narrows to Alice only, re-rendering the SAME
    // container (rerender, not a second render, so the DOM isn't duplicated).
    mockUseDeactivatedUserTable.mockImplementation(
      makeHookImpl({ filtered: [ALICE], hasNextPage: false }),
    );
    rerender(<DeactivatedUsersTable />);

    expect(screen.getAllByText("Alice Reyes")).toHaveLength(2);
    expect(screen.queryByText("Bob Santos")).not.toBeInTheDocument();
  });
});

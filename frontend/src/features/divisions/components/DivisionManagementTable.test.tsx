/**
 * Component (UI) tests for `DivisionManagementTable`.
 *
 * WHY THIS FILE EXISTS:
 *   The hook tests (`use-division-management-table`, `use-divisions`,
 *   `use-update-division-name`, `use-delete-division`) cover state logic in
 *   isolation. This file verifies the *component* — i.e. that
 *   `DivisionManagementTable` wires its mocked hook state to real rendering in
 *   `TableShell` / `KebabMenu`: toolbar controls (search, sort, clear-filters),
 *   kebab-menu actions opening the right modal, action-state indicators
 *   (saving / deleting), and the loading / error / pagination footers that drive
 *   the infinite-scroll UX.
 *
 * STRATEGY (mirrors `UserManagementTable.test.tsx`):
 *   - Mock `useDivisionManagementTable` as a *stateful* implementation (real
 *     `useState` / `useRef` inside `mockImplementation`) so user interactions
 *     (typing a search, clicking a kebab item, toggling sort) actually re-render
 *     the component and we can assert on the resulting DOM — not just on spy
 *     calls. Display flags (isLoading / isError / divisions / hasNextPage /
 *     isFetchingNextPage) and action states (isRenaming / renamingId / isDeleting
 *     / deleteError) come from a per-test override object.
 *   - Stub the three modal sub-components and the two skeleton primitives to
 *     lightweight data-testid markers that still reflect `isSaving` / `isDeleting`
 *     props (so action-state assertions work). We are testing the *table*, not
 *     the modal internals (those have their own tests); stubbing keeps a
 *     QueryClient provider unnecessary and keeps the focus sharp.
 *
 * Covered scenarios (mapped to the user's request):
 *   1. Loading indicator — isLoading renders skeletons (mobile + desktop),
 *      withholds data rows and pagination footers.
 *   2. "Loading more…" footer — isFetchingNextPage renders the bottom loader
 *      (mobile card + desktop table).
 *   3. "No more / all loaded" — hasNextPage=false renders "No more divisions"
 *      (mobile) and "(all loaded)" (desktop).
 *   4. Error banner — isError renders "Failed to load divisions: {msg}".
 *   5. Filter — typing search is a controlled input that flips isFiltered
 *      (→ Clear button appears); clear resets search + sort.
 *   6. Sort select — changing <select> flips sort, flips isFiltered (since
 *      non-default), enables Clear.
 *   7. Filter narrows results — rebinding `divisions` to a subset proves only
 *      those render (Equipment/Administrative gone, Civil Works remains).
 *   8. Row content — name + user-count appear in both mobile card & desktop row.
 *   9. Kebab → Rename opens EditDivisionModal for the correct division.
 *   10. Kebab → Delete opens DeleteDivisionModal for the correct division.
 *   11. Delete disabled when division has users (userCount > 0).
 *   12. View users — clicking UserAvatarStack opens DivisionUsersModal.
 *   13. handleRename / handleDelete are invoked from the modal stubs with the
 *       targeted division's id.
 *   14. No modal leaks before a kebab/avatar action fires.
 *
 *   Modal action-process states (isSaving / isDeleting / deleteError rendering)
 *   are tested separately in EditDivisionModal.test.tsx and
 *   DeleteDivisionModal.test.tsx using the real modal components.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Division } from "../type/division.type";
import type { DivisionSort } from "../type/division-api.type";
import DivisionManagementTable from "./DivisionManagementTable";

// ─── Mocked hook (stateful impl set per test) ─────────────────────────────────

const { mockUseDivisionManagementTable } = vi.hoisted(() => ({
  mockUseDivisionManagementTable: vi.fn(),
}));

vi.mock("../hooks/use-division-management-table", () => ({
  useDivisionManagementTable: mockUseDivisionManagementTable,
}));

// ─── Modal stubs ──────────────────────────────────────────────────────────────
// Each stub renders an identifiable marker plus the targeted division's name so
// we can assert *which* division an action was fired on (proves the kebab
// wiring). Action-state props (isSaving / isDeleting / error) are surfaced as
// data-testid buttons with dynamic text so we can assert action-process states.

vi.mock("./modal/EditDivisionModal", () => ({
  default: function EditDivisionModalStub({
    division,
    onClose,
    onSave,
    isSaving,
  }: {
    division: Division;
    onClose: () => void;
    onSave: (newName: string) => void;
    isSaving?: boolean;
  }) {
    return (
      <div data-testid="edit-division-modal">
        <span data-testid="edit-division-name">Edit {division.name}</span>
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          data-testid="edit-close"
        >
          Close
        </button>
        <button
          type="button"
          data-testid="edit-save"
          onClick={() => onSave("New Division Name")}
          disabled={isSaving}
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </div>
    );
  },
}));

vi.mock("./modal/DeleteDivisionModal", () => ({
  default: function DeleteDivisionModalStub({
    division,
    onClose,
    onConfirm,
    isDeleting,
    error,
  }: {
    division: Division;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting?: boolean;
    error?: Error | null;
  }) {
    return (
      <div data-testid="delete-division-modal">
        <span data-testid="delete-division-name">Delete {division.name}</span>
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          data-testid="delete-close"
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="delete-confirm"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
        {error && (
          <span data-testid="delete-error">{error.message}</span>
        )}
      </div>
    );
  },
}));

vi.mock("./DivisionUsersModal", () => ({
  default: function DivisionUsersModalStub({
    division,
    onClose,
  }: {
    division: Division;
    onClose: () => void;
  }) {
    return (
      <div data-testid="division-users-modal">
        <span data-testid="users-division-name">Users in {division.name}</span>
        <button type="button" onClick={onClose} data-testid="users-close">
          Close
        </button>
      </div>
    );
  },
}));

// ─── Skeleton stubs ────────────────────────────────────────────────────────────
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

const CIVIL_WORKS: Division = {
  id: "d1",
  name: "Civil Works Division",
  users: [
    {
      id: "u1",
      fullName: "Maria Santos",
      position: "Division Head",
      email: "maria.santos@peo.gov.ph",
      role: "Admin",
      isActive: true,
    },
    {
      id: "u2",
      fullName: "Jose Reyes",
      position: "Civil Engineer II",
      email: "jose.reyes@peo.gov.ph",
      role: "Staff",
      isActive: true,
    },
  ],
  userCount: 2,
};

const EQUIPMENT: Division = {
  id: "d2",
  name: "Equipment Division",
  users: [],
  userCount: 0,
};

const ADMINISTRATIVE: Division = {
  id: "d3",
  name: "Administrative Division",
  users: [
    {
      id: "u3",
      fullName: "Brian Ebrahim",
      position: "Admin Assistant",
      email: "brian@peo.gov.ph",
      role: "Receiver",
      isActive: true,
    },
  ],
  userCount: 1,
};

const DIVISIONS: Division[] = [CIVIL_WORKS, EQUIPMENT, ADMINISTRATIVE];

/**
 * Display-flag overrides that drive what TableShell renders.
 * - Display flags (isLoading / isError / …): come from overrides, NOT internal
 *   state, so a single `makeHookImpl({ isLoading: true })` call flips the whole
 *   component into loading mode.
 * - Action states (isRenaming / renamingId / isDeleting / deleteError): also
 *   overrides, so we can assert "Saving…" / "Deleting…" without simulating the
 *   mutation lifecycle.
 * - Initial modal targets (initialEditTarget / initialDeleteTarget /
 *   initialViewTarget): seed the real useState so we can test action-state
 *   rendering directly without first driving a kebab click.
 */
interface HookDisplayState {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  divisions?: Division[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isRenaming?: boolean;
  renamingId?: string | undefined;
  isDeleting?: boolean;
  deleteError?: Error | null;
  initialEditTarget?: Division | null;
  initialDeleteTarget?: Division | null;
  initialViewTarget?: Division | null;
}

/**
 * Build a stateful mock implementation: the form fields (search / sort / modal
 * targets) are real `useState` so interactions re-render; the display flags and
 * action states come from `overrides`. This lets a single test drive a click
 * and assert the resulting DOM change.
 */
function makeHookImpl(overrides: HookDisplayState = {}) {
  // Stable vi.fn() references so tests can assert calls across re-renders
  // (creating a new vi.fn() inside the hook body would give each render a
  // different instance).
  const handleRename = vi.fn();
  const handleDelete = vi.fn();

  const impl = function useDivisionManagementTable() {
    const [search, setSearch] = React.useState("");
    const [sort, setSort] = React.useState<DivisionSort>("name_asc");
    const [editTarget, setEditTarget] = React.useState<Division | null>(
      overrides.initialEditTarget ?? null,
    );
    const [deleteTarget, setDeleteTarget] = React.useState<Division | null>(
      overrides.initialDeleteTarget ?? null,
    );
    const [viewTarget, setViewTarget] = React.useState<Division | null>(
      overrides.initialViewTarget ?? null,
    );

    // Refs that TableShell attaches as sentinels / scroll roots.
    const mobileScrollRef = React.useRef<HTMLDivElement | null>(null);
    const mobileSentinelRef = React.useRef<HTMLDivElement | null>(null);
    const desktopScrollRef = React.useRef<HTMLDivElement | null>(null);
    const desktopSentinelRef = React.useRef<HTMLDivElement | null>(null);

    // Mirrors the real hook: filters are "active" when any non-default value.
    const isFiltered = search.trim() !== "" || sort !== "name_asc";

    const clearFilters = React.useCallback(() => {
      setSearch("");
      setSort("name_asc");
    }, []);

    return {
      isLoading: overrides.isLoading ?? false,
      isError: overrides.isError ?? false,
      error: overrides.error ?? null,
      divisions: overrides.divisions ?? [],
      search,
      setSearch,
      sort,
      setSort,
      isFiltered,
      clearFilters,
      hasNextPage: overrides.hasNextPage ?? false,
      isFetchingNextPage: overrides.isFetchingNextPage ?? false,
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
      isRenaming: overrides.isRenaming ?? false,
      renamingId: overrides.renamingId,
      handleDelete,
      isDeleting: overrides.isDeleting ?? false,
      deleteError: overrides.deleteError ?? null,
    };
  };

  // Expose stable vi.fn() references for test assertions.
  return Object.assign(impl, { handleRename, handleDelete });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DivisionManagementTable (UI)", () => {
  beforeEach(() => {
    // Default: a loaded, paginatable list of three divisions. Individual tests
    // re-bind the implementation when they need different display flags.
    mockUseDivisionManagementTable.mockImplementation(
      makeHookImpl({ divisions: DIVISIONS, hasNextPage: true }),
    );
  });

  // ── Toolbar controls ─────────────────────────────────────────────────────

  it("renders the search input bound to hook state, and typing flips isFiltered (Clear appears)", () => {
    render(<DivisionManagementTable />);

    const input = screen.getByPlaceholderText(
      "Search divisions…",
    ) as HTMLInputElement;
    expect(input.value).toBe(""); // starts empty

    fireEvent.change(input, { target: { value: "civil" } });

    // Controlled: the input reflects the new search value.
    expect(input.value).toBe("civil");
    // isFiltered reacted → Clear button materialised.
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("renders the sort <select> and changing it flips isFiltered (Clear appears)", () => {
    render(<DivisionManagementTable />);

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("name_asc");

    fireEvent.change(select, { target: { value: "most_users" } });

    // Controlled: select value updated, and since sort != default isFiltered.
    expect(select.value).toBe("most_users");
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("shows Clear only when filters are active, and clicking it resets search + sort", () => {
    render(<DivisionManagementTable />);

    // No filters yet → no Clear button.
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();

    // Activate a filter via search.
    fireEvent.change(screen.getByPlaceholderText("Search divisions…"), {
      target: { value: "equip" },
    });
    expect(screen.getByText("Clear")).toBeInTheDocument();

    // Reset.
    fireEvent.click(screen.getByText("Clear"));

    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
    // Search input cleared back to empty.
    expect(
      (screen.getByPlaceholderText("Search divisions…") as HTMLInputElement).value,
    ).toBe("");
  });

  // ── Row content ───────────────────────────────────────────────────────────

  it("renders each division name in both the mobile card and the desktop table", () => {
    render(<DivisionManagementTable />);

    // TableShell renders a mobile card + a desktop row per division, so each
    // name appears twice.
    expect(screen.getAllByText("Civil Works Division")).toHaveLength(2);
    expect(screen.getAllByText("Equipment Division")).toHaveLength(2);
    expect(screen.getAllByText("Administrative Division")).toHaveLength(2);
  });

  it("renders the user count for each division (mobile card + desktop Total)", () => {
    render(<DivisionManagementTable />);

    // Mobile card subline renders "N users" (exact string), desktop Total
    // column renders the bare number as a <span>.
    expect(screen.getAllByText("2 users")).toHaveLength(1); // Civil Works mobile
    expect(screen.getAllByText("1 user")).toHaveLength(1); // Administrative mobile
    expect(screen.getAllByText("2")).toHaveLength(1); // Civil Works desktop Total
    expect(screen.getAllByText("1")).toHaveLength(1); // Administrative desktop Total
  });

  it("renders 'No users' for divisions with zero users", () => {
    render(<DivisionManagementTable />);

    expect(screen.getAllByText("No users")).toHaveLength(2); // mobile card + desktop cell
  });

  // ── Kebab menu → modal wiring ─────────────────────────────────────────────

  /*
   * Each row mounts TWO kebabs — one inside the mobile card and one in the
   * desktop <Action> column — so getAllByTitle("Division actions") returns both;
   * we open the first one. Both kebabs share the same per-division actions.
   */

  it("opens EditDivisionModal for the clicked division when 'Rename' (kebab) is chosen", () => {
    render(<DivisionManagementTable />);

    fireEvent.click(screen.getAllByTitle("Division actions")[0]);

    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    expect(screen.getByTestId("edit-division-modal")).toBeInTheDocument();
    expect(screen.getByTestId("edit-division-name")).toHaveTextContent(
      "Edit Civil Works Division",
    );
  });

  it("opens DeleteDivisionModal for the clicked division when 'Delete' (kebab) is chosen", () => {
    /*
     * Civil Works has 2 users → Delete kebab is disabled. Use Equipment (0
     * users) so the delete action is enabled.
     */
    mockUseDivisionManagementTable.mockImplementation(
      makeHookImpl({ divisions: [EQUIPMENT], hasNextPage: false }),
    );

    render(<DivisionManagementTable />);

    fireEvent.click(screen.getAllByTitle("Division actions")[0]);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(screen.getByTestId("delete-division-modal")).toBeInTheDocument();
    expect(screen.getByTestId("delete-division-name")).toHaveTextContent(
      "Delete Equipment Division",
    );
  });

  it("disables Delete in the kebab when the division has users (userCount > 0)", () => {
    render(<DivisionManagementTable />);

    // Open the kebab for Civil Works (userCount = 2).
    fireEvent.click(screen.getAllByTitle("Division actions")[0]);

    const deleteAction = screen.getByRole("button", { name: "Delete" });
    expect(deleteAction).toBeDisabled();
  });

  it("keeps Delete enabled in the kebab when the division has no users", () => {
    // Equip the hook with only Equipment (userCount = 0) so the first kebab
    // is for an deletable division.
    mockUseDivisionManagementTable.mockImplementation(
      makeHookImpl({ divisions: [EQUIPMENT], hasNextPage: false }),
    );

    render(<DivisionManagementTable />);

    fireEvent.click(screen.getAllByTitle("Division actions")[0]);

    const deleteAction = screen.getByRole("button", { name: "Delete" });
    expect(deleteAction).not.toBeDisabled();
  });

  it("opens DivisionUsersModal when the UserAvatarStack is clicked", () => {
    render(<DivisionManagementTable />);

    // UserAvatarStack renders a button titled "View N users…"; for Civil Works
    // (2 users) the title is "View 2 users". There are two (mobile + desktop).
    fireEvent.click(screen.getAllByTitle("View 2 users")[0]);

    expect(screen.getByTestId("division-users-modal")).toBeInTheDocument();
    expect(screen.getByTestId("users-division-name")).toHaveTextContent(
      "Users in Civil Works Division",
    );
  });

  it("invokes handleRename with the division id when Save is clicked in EditDivisionModal", () => {
    /*
     * Capture the impl so we can assert on the stable vi.fn() handleRename
     * (created once in makeHookImpl and reused across renders).
     */
    const impl = makeHookImpl({ divisions: DIVISIONS, hasNextPage: true });
    mockUseDivisionManagementTable.mockImplementation(impl);

    render(<DivisionManagementTable />);

    fireEvent.click(screen.getAllByTitle("Division actions")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    fireEvent.click(screen.getByTestId("edit-save"));

    expect(impl.handleRename).toHaveBeenCalledTimes(1);
    expect(impl.handleRename).toHaveBeenCalledWith("d1", "New Division Name");
  });

  it("invokes handleDelete when Delete is confirmed in DeleteDivisionModal", () => {
    const impl = makeHookImpl({
      divisions: DIVISIONS,
      hasNextPage: true,
      initialDeleteTarget: EQUIPMENT, // 0 users → deletable
    });
    mockUseDivisionManagementTable.mockImplementation(impl);

    render(<DivisionManagementTable />);

    // DeleteDivisionModal is already open because deleteTarget is seeded.
    expect(screen.getByTestId("delete-division-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("delete-confirm"));

    expect(impl.handleDelete).toHaveBeenCalledTimes(1);
  });

  it("renders no modal until a kebab or avatar action is taken", () => {
    render(<DivisionManagementTable />);

    expect(screen.queryByTestId("edit-division-modal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("delete-division-modal")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("division-users-modal"),
    ).not.toBeInTheDocument();
  });

  // ── Loading / error UI ─────────────────────────────────────────────────────

  it("renders skeletons while isLoading and withholds the data rows", () => {
    mockUseDivisionManagementTable.mockImplementation(
      makeHookImpl({ divisions: DIVISIONS, isLoading: true }),
    );

    render(<DivisionManagementTable />);

    expect(screen.getByTestId("mobile-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("desktop-skeleton")).toBeInTheDocument();
    // Data is hidden during load.
    expect(
      screen.queryByText("Civil Works Division"),
    ).not.toBeInTheDocument();
    // The infinite-scroll footers are data-section only.
    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No more/i)).not.toBeInTheDocument();
  });

  it("renders the error banner (with message) when isError and hides rows", () => {
    mockUseDivisionManagementTable.mockImplementation(
      makeHookImpl({
        divisions: DIVISIONS,
        isError: true,
        error: new Error("Killed by gremlins"),
      }),
    );

    render(<DivisionManagementTable />);

    expect(
      screen.getByText(/Failed to load divisions: Killed by gremlins/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("desktop-skeleton")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Civil Works Division"),
    ).not.toBeInTheDocument();
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  it("renders the empty message when there are no divisions", () => {
    mockUseDivisionManagementTable.mockImplementation(
      makeHookImpl({ divisions: [], hasNextPage: false }),
    );

    render(<DivisionManagementTable />);

    // Appears once in the mobile card + once in the desktop table.
    expect(
      screen.getAllByText(/No divisions match your search\./),
    ).toHaveLength(2);
    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
  });

  // ── Infinite-scroll footers (loading at the bottom) ────────────────────────

  it("shows 'Loading more…' at the bottom while isFetchingNextPage is true", () => {
    mockUseDivisionManagementTable.mockImplementation(
      makeHookImpl({
        divisions: DIVISIONS,
        hasNextPage: true,
        isFetchingNextPage: true,
      }),
    );

    render(<DivisionManagementTable />);

    // The "Loading more…" footer appears once for the mobile list and once for
    // the desktop table.
    expect(screen.getAllByText(/Loading more/i)).toHaveLength(2);
    // While fetching, there is no "no more" message.
    expect(screen.queryByText(/No more/i)).not.toBeInTheDocument();
  });

  it("shows 'No more divisions' + '(all loaded)' when hasNextPage is false (all loaded)", () => {
    mockUseDivisionManagementTable.mockImplementation(
      makeHookImpl({
        divisions: DIVISIONS,
        hasNextPage: false,
        isFetchingNextPage: false,
      }),
    );

    render(<DivisionManagementTable />);

    // Mobile-only footer: TableShell never renders "No more" in the desktop
    // table — there the summary row appends "(all loaded)" instead.
    expect(screen.getAllByText(/No more divisions/i)).toHaveLength(1);
    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    // Desktop summary switches to the "(all loaded)" affordance instead.
    expect(document.body.textContent).toMatch(/\(all loaded\)/);
  });

  it("hides both footers while fetching is idle and more pages remain", () => {
    mockUseDivisionManagementTable.mockImplementation(
      makeHookImpl({
        divisions: DIVISIONS,
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    );

    render(<DivisionManagementTable />);

    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No more/i)).not.toBeInTheDocument();
  });

  // Action-process states (isSaving / isDeleting / deleteError rendering
  // inside the modals) are tested in the dedicated modal test files:
  //   EditDivisionModal.test.tsx
  //   DeleteDivisionModal.test.tsx

  // ── Filter narrows results ───────────────────────────────────────────────────

  it("typing in search keeps the list filtered to the hook's divisions array", () => {
    /*
     * End-to-end-ish wiring of the filter request: the search box is controlled
     * by the hook, and the rows always mirror the hook's divisions output. Here
     * we simulate a filter applied server-side by re-binding the implementation
     * with only Civil Works, then confirm Equipment and Administrative are gone
     * while Civil Works remains.
     */
    const { rerender } = render(<DivisionManagementTable />);

    // Initial render shows all three divisions (each twice: mobile + desktop).
    expect(screen.getAllByText("Civil Works Division")).toHaveLength(2);
    expect(screen.getAllByText("Equipment Division")).toHaveLength(2);
    expect(screen.getAllByText("Administrative Division")).toHaveLength(2);

    // Type a search term (controlled input — re-renders with new value).
    fireEvent.change(screen.getByPlaceholderText("Search divisions…"), {
      target: { value: "civil" },
    });

    // Apply a filter that narrows to only Civil Works.
    mockUseDivisionManagementTable.mockImplementation(
      makeHookImpl({ divisions: [CIVIL_WORKS], hasNextPage: false }),
    );
    rerender(<DivisionManagementTable />);

    expect(screen.getAllByText("Civil Works Division")).toHaveLength(2);
    expect(
      screen.queryByText("Equipment Division"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Administrative Division"),
    ).not.toBeInTheDocument();
  });
});

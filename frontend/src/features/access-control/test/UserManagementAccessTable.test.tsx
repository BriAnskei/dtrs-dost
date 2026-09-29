/**
 * Unit tests for the `UserManagementAccessTable` access-control table.
 *
 * This is the top-level container that renders the search bar, infinite-scroll
 * admin list, and per-row `AdminAccessRow` editors. It is driven by the
 * `useUserManagementAccessTable` hook, which in turn calls:
 *
 *   - useUserManagementPermissions (infinite query → API pagination)
 *   - useSetUserManagementPermission  (PUT → grant/revoke flags)
 *   - useRevokeUserManagementPermission (DELETE → revoke master access)
 *
 * ─── BACKEND → UI DATA FLOW ───────────────────────────────────────────────────────
 *
 *   Backend (NestJS):
 *     GET    /user-permissions/user-management?name=…&cursor=…&limit=20
 *            → PaginatedResponse<UserManagementPermission>
 *     PUT    /user-permissions/user-management/:id  (body: GrantUserManagementPermissionDto)
 *     DELETE /user-permissions/:id/user-management
 *
 *   The API returns admins with a nested `data: ManagementPermissions | null`.
 *   When `data` is null the admin has NO user-management access (master off).
 *   When `data` is present, master is ON and each field is a boolean flag.
 *
 *   Frontend: `mapUserPermissionToAdminPermissions()` flattens `data` into the
 *   `AdminPermissions` record that `AdminAccessRow` consumes.
 *
 * ─── WHAT THIS FILE TESTS ────────────────────────────────────────────────────────
 *
 *   1. Loading state — initial isLoading → "Loading admins…" banner.
 *   2. Error state — isError → error banner.
 *   3. Empty state — no admins + not loading/error → "No admins match your search."
 *   4. Search input — typing updates the search string.
 *   5. Clear button — appears when search has value, resets search.
 *   6. Infinite scroll — "Loading more…" when isFetchingNextPage.
 *   7. Infinite scroll — "No more admins" when !hasNextPage.
 *   8. Infinite scroll — no footer when idle and more pages exist.
 *   9. Admin rows render — each admin is passed to AdminAccessRow.
 *  10. Save bar / permission state flows from the hook to each row.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { USER_MANAGEMENT_PERMISSIONS } from "../contants";
import type { AdminAccount, AdminPermissions } from "../types/access-controll-types";

import UserManagementAccessTable from "../components/UserManagementAccessTable";

// ─── Mocked hook ──────────────────────────────────────────────────────────────────
//
// We replace `useUserManagementAccessTable` so we can deterministically
// control every display flag: isLoading, isError, admins, hasNextPage,
// isFetchingNextPage, savingAdminId, etc.
//
// This is the same strategy used in the existing component tests elsewhere
// in the repo — mock the hook, not the component.

const { mockUseTable } = vi.hoisted(() => ({
  mockUseTable: vi.fn(),
}));

vi.mock("../hooks/user-user-management-access-table", () => ({
  useUserManagementAccessTable: mockUseTable,
}));

// ─── Mocked AdminAccessRow ────────────────────────────────────────────────────────
//
// We stub AdminAccessRow so we can assert it receives the right props
// (permissions, savedValues, isSaving, onSave) without testing its
// internal rendering — those are covered in AdminAccessRow.test.tsx.

vi.mock("../components/AdminAccessRow", () => ({
  default: function AdminAccessRowStub({
    admin,
    permissions,
    savedValues,
    isSaving,
    onSave,
  }: {
    admin: { id: string; name: string; email: string; avatar: string };
    permissions: { key: string }[];
    savedValues: AdminPermissions;
    isSaving: boolean;
    onSave: (adminId: string, values: AdminPermissions) => void;
  }) {
    return (
      <div data-testid="admin-access-row" data-admin-id={admin.id}>
        <span data-testid="admin-name">{admin.name}</span>
        <span data-testid="admin-is-saving">{isSaving ? "saving" : "idle"}</span>
        <button
          data-testid="save-trigger"
          disabled={isSaving}
          onClick={() => onSave(admin.id, savedValues)}
        >
          Save
        </button>
      </div>
    );
  },
}));

// ─── Mocked skeleton/stub components ──────────────────────────────────────────────

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────────

/** Admins as returned by the hook (mapped from API response by
 * mapUserPermissionToAdminAccount). The hook converts the raw API
 * `UserManagementPermission` into this `AdminAccount` shape. */
const ADMINS: AdminAccount[] = [
  {
    id: "admin-1",
    name: "Alice Reyes",
    email: "alice@peo.gov.ph",
    avatar: "AR",
  },
  {
    id: "admin-2",
    name: "Bob Santos",
    email: "bob@peo.gov.ph",
    avatar: "BS",
  },
];

/** Build a stateful mock impl with real useState for search. */
function makeHookImpl(overrides: {
  isLoading?: boolean;
  isError?: boolean;
  admins?: UserManagementPermission[];
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  savingAdminId?: string | null;
  saveAdminPermissions?: (adminId: string, values: AdminPermissions) => void;
}) {
  return function useUserManagementAccessTable() {
    const [search, setSearch] = React.useState("");
    const hasFilters = search.trim().length > 0;

    return {
      search,
      setSearch,
      admins: overrides.admins ?? [],
      permissionsByAdmin: {}, // not tested via stub
      savingAdminId: overrides.savingAdminId ?? null,
      saveAdminPermissions: overrides.saveAdminPermissions ?? vi.fn(),
      isLoading: overrides.isLoading ?? false,
      isError: overrides.isError ?? false,
      hasNextPage: overrides.hasNextPage ?? false,
      isFetchingNextPage: overrides.isFetchingNextPage ?? false,
      scrollRef: React.useRef<HTMLDivElement | null>(null),
      sentinelRef: React.useRef<HTMLDivElement | null>(null),
    };
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────────

describe("UserManagementAccessTable — loading state", () => {
  it("shows 'Loading admins…' banner when isLoading is true", () => {
    /*
     * During the initial fetch, the table is empty and a loading banner is
     * shown inside the scroll container. No admin rows, no footers.
     */
    mockUseTable.mockImplementation(
      makeHookImpl({ isLoading: true, admins: [] }),
    );

    render(<UserManagementAccessTable />);

    expect(screen.getByText("Loading admins…")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-access-row")).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading more/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No more admins/i)).not.toBeInTheDocument();
  });
});

describe("UserManagementAccessTable — error state", () => {
  it("shows error banner when isError is true", () => {
    mockUseTable.mockImplementation(
      makeHookImpl({ isError: true, admins: [] }),
    );

    render(<UserManagementAccessTable />);

    expect(
      screen.getByText(/Couldn't load admins\. Please try again\./i),
    ).toBeInTheDocument();
  });
});

describe("UserManagementAccessTable — empty state", () => {
  it("shows 'No admins match your search.' when loaded with zero admins", () => {
    mockUseTable.mockImplementation(
      makeHookImpl({ isLoading: false, isError: false, admins: [] }),
    );

    render(<UserManagementAccessTable />);

    expect(
      screen.getByText("No admins match your search."),
    ).toBeInTheDocument();
    // No loading or error indicators.
    expect(screen.queryByText(/Loading admins/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Couldn't load admins/i)).not.toBeInTheDocument();
  });
});

describe("UserManagementAccessTable — search + clear", () => {
  it("renders a search input with the correct placeholder", () => {
    mockUseTable.mockImplementation(
      makeHookImpl({ admins: ADMINS }),
    );

    render(<UserManagementAccessTable />);

    expect(
      screen.getByPlaceholderText("Search admin by name or email..."),
    ).toBeInTheDocument();
  });

  it("typing in the search input calls setSearch", () => {
    /*
     * The search input is wired to `setSearch` from the hook. Since we use
     * a stateful mock with real useState, typing re-renders and the input
     * value updates. The "Clear" button appears when search is non-empty.
     */
    mockUseTable.mockImplementation(makeHookImpl({ admins: ADMINS }));

    render(<UserManagementAccessTable />);

    const input = screen.getByPlaceholderText("Search admin by name or email...");
    fireEvent.change(input, { target: { value: "alice" } });

    // After typing, the search value is reflected in the input.
    expect(input).toHaveValue("alice");

    // Clear button appears when search has content.
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("Clear button resets search to empty", () => {
    mockUseTable.mockImplementation(makeHookImpl({ admins: ADMINS }));

    render(<UserManagementAccessTable />);

    const input = screen.getByPlaceholderText("Search admin by name or email...");
    fireEvent.change(input, { target: { value: "bob" } });

    expect(screen.getByText("Clear")).toBeInTheDocument();

    // Click Clear → search resets → Clear button disappears.
    fireEvent.click(screen.getByText("Clear"));

    expect(input).toHaveValue("");
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
  });

  it("does NOT show Clear button when search is empty", () => {
    mockUseTable.mockImplementation(makeHookImpl({ admins: ADMINS }));

    render(<UserManagementAccessTable />);

    expect(screen.queryByText("Clear")).not.toBeInTheDocument();
  });
});

describe("UserManagementAccessTable — admin rows render", () => {
  it("renders one AdminAccessRow stub per admin", () => {
    mockUseTable.mockImplementation(makeHookImpl({ admins: ADMINS }));

    render(<UserManagementAccessTable />);

    const rows = screen.getAllByTestId("admin-access-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-admin-id", "admin-1");
    expect(rows[1]).toHaveAttribute("data-admin-id", "admin-2");
  });

  it("renders admin names inside each row", () => {
    mockUseTable.mockImplementation(makeHookImpl({ admins: ADMINS }));

    render(<UserManagementAccessTable />);

    const names = screen.getAllByTestId("admin-name");
    expect(names[0].textContent).toBe("Alice Reyes");
    expect(names[1].textContent).toBe("Bob Santos");
  });

  it("does not render admin rows when isLoading is true", () => {
    mockUseTable.mockImplementation(
      makeHookImpl({ isLoading: true, admins: ADMINS }),
    );

    render(<UserManagementAccessTable />);

    expect(screen.queryByTestId("admin-access-row")).not.toBeInTheDocument();
    // Loading banner takes precedence.
    expect(screen.getByText("Loading admins…")).toBeInTheDocument();
  });

  it("does not render admin rows when isError is true", () => {
    mockUseTable.mockImplementation(
      makeHookImpl({ isError: true, admins: ADMINS }),
    );

    render(<UserManagementAccessTable />);

    expect(screen.queryByTestId("admin-access-row")).not.toBeInTheDocument();
  });
});

describe("UserManagementAccessTable — saving state", () => {
  it("passes isSaving=true to the row whose admin is currently saving", () => {
    /*
     * The hook tracks `savingAdminId` — only the row for that admin gets
     * `isSaving` (and thus all its toggles disabled). Other rows remain
     * interactive.
     */
    mockUseTable.mockImplementation(
      makeHookImpl({
        admins: ADMINS,
        savingAdminId: "admin-1",
      }),
    );

    render(<UserManagementAccessTable />);

    const rows = screen.getAllByTestId("admin-access-row");

    // Row for admin-1 is saving; row for admin-2 is idle.
    expect(rows[0].querySelector('[data-testid="admin-is-saving"]')).toHaveTextContent(
      "saving",
    );
    expect(rows[1].querySelector('[data-testid="admin-is-saving"]')).toHaveTextContent(
      "idle",
    );
  });

  it("save button in the saving row is disabled", () => {
    mockUseTable.mockImplementation(
      makeHookImpl({
        admins: ADMINS,
        savingAdminId: "admin-1",
      }),
    );

    render(<UserManagementAccessTable />);

    const rows = screen.getAllByTestId("admin-access-row");
    const saveBtn = rows[0].querySelector('[data-testid="save-trigger"]');
    expect(saveBtn).toBeDisabled();
  });
});

// ─── Infinite scroll ──────────────────────────────────────────────────────────────
//
// The table uses an Intersection Observer (via useInfiniteScrollSentinel)
// on the sentinel div at the bottom of the scroll container. When the
// sentinel intersects and `hasNextPage` is true, `fetchNextPage()` fires.
//
// While the fetch is in-flight, `isFetchingNextPage` is true and the
// "Loading more…" footer appears. When all pages are exhausted
// (`hasNextPage === false`), the footer changes to "No more admins".
//
// These tests verify the footer text and that BOTH footers (mobile list +
// desktop table) render when applicable.

describe("UserManagementAccessTable — infinite scroll footers", () => {
  it("shows 'Loading more…' when isFetchingNextPage is true", () => {
    /*
     * User scrolled to the bottom → `fetchNextPage()` is in flight →
     * `isFetchingNextPage=true`. The "Loading more…" paragraph appears
     * inside the scroll container after the admin rows.
     *
     * The scroll container is mounted in the scroll-container div, and the
     * footer text lives there alongside the admin list items.
     */
    mockUseTable.mockImplementation(
      makeHookImpl({
        admins: ADMINS,
        hasNextPage: true,
        isFetchingNextPage: true,
      }),
    );

    render(<UserManagementAccessTable />);

    expect(screen.getByText("Loading more…")).toBeInTheDocument();
    // "No more admins" must NOT appear while fetching.
    expect(screen.queryByText("No more admins")).not.toBeInTheDocument();
  });

  it("shows 'No more admins' when hasNextPage is false and not fetching", () => {
    mockUseTable.mockImplementation(
      makeHookImpl({
        admins: ADMINS,
        hasNextPage: false,
        isFetchingNextPage: false,
      }),
    );

    render(<UserManagementAccessTable />);

    expect(screen.getByText("No more admins")).toBeInTheDocument();
    expect(screen.queryByText("Loading more…")).not.toBeInTheDocument();
  });

  it("shows neither footer when idle and more pages remain (sentinel armed, not firing)", () => {
    /*
     * hasNextPage=true, isFetchingNextPage=false → the user hasn't scrolled
     * to the bottom yet. Neither footer should appear.
     */
    mockUseTable.mockImplementation(
      makeHookImpl({
        admins: ADMINS,
        hasNextPage: true,
        isFetchingNextPage: false,
      }),
    );

    render(<UserManagementAccessTable />);

    expect(screen.queryByText("Loading more…")).not.toBeInTheDocument();
    expect(screen.queryByText("No more admins")).not.toBeInTheDocument();
  });

  it("shows 'Loading more…' even when search filters narrow the list", () => {
    /*
     * The footers are independent of search — they only depend on
     * hasNextPage and isFetchingNextPage. Even with a search query active,
     * "Loading more…" must appear when fetching.
     */
    mockUseTable.mockImplementation(
      makeHookImpl({
        admins: [ADMINS[0]],
        hasNextPage: true,
        isFetchingNextPage: true,
      }),
    );

    render(<UserManagementAccessTable />);

    // Type a search to filter.
    const input = screen.getByPlaceholderText("Search admin by name or email...");
    fireEvent.change(input, { target: { value: "alice" } });

    // Footer still visible because the hook controls it, not the search.
    expect(screen.getByText("Loading more…")).toBeInTheDocument();
  });
});

describe("UserManagementAccessTable — info banner", () => {
  it("renders the info banner with 'Control who can manage users'", () => {
    mockUseTable.mockImplementation(makeHookImpl({ admins: ADMINS }));

    render(<UserManagementAccessTable />);

    expect(
      screen.getByText(/Control who can manage users\./i),
    ).toBeInTheDocument();
  });

  it("renders the banner in every state (loading, error, empty, data)", () => {
    /*
     * The info banner is always visible at the top, regardless of table
     * state — it's outside the conditional blocks.
     */
    mockUseTable.mockImplementation(makeHookImpl({ isLoading: true, admins: [] }));
    const { unmount } = render(<UserManagementAccessTable />);
    expect(
      screen.getByText(/Control who can manage users\./i),
    ).toBeInTheDocument();
    unmount();

    mockUseTable.mockImplementation(makeHookImpl({ isError: true, admins: [] }));
    const { unmount: u2 } = render(<UserManagementAccessTable />);
    expect(
      screen.getByText(/Control who can manage users\./i),
    ).toBeInTheDocument();
    u2();

    mockUseTable.mockImplementation(makeHookImpl({ isLoading: false, admins: [] }));
    render(<UserManagementAccessTable />);
    expect(
      screen.getByText(/Control who can manage users\./i),
    ).toBeInTheDocument();
  });
});

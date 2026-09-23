import type { ReactNode, RefObject } from "react";
import { THIN_SCROLLBAR } from "../../contant/ThinScrollBar";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import MobileCardSkeleton from "./Skeleton/MobileCardSkeleton";
import type { TableSkeletonColumn } from "./Skeleton/TableSkeleton";
import TableSkeleton from "./Skeleton/TableSkeleton";

export type TableShellColumn = TableSkeletonColumn;

export interface TableShellProps<T> {
  /** Column definitions — used for both header rendering and the loading skeleton. */
  columns: TableShellColumn[];
  /** Data items to render (via renderMobileCard / renderDesktopRow). */
  data: T[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  /** Plural entity name, e.g. "users" or "divisions" — used in error + count text. */
  entityName: string;
  /** Shown in both the desktop empty-state cell and the mobile empty-state card. */
  emptyMessage: string;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  mobileScrollRef: RefObject<HTMLDivElement | null>;
  mobileSentinelRef: RefObject<HTMLDivElement | null>;
  desktopScrollRef: RefObject<HTMLDivElement | null>;
  desktopSentinelRef: RefObject<HTMLDivElement | null>;
  maxTableHeight?: string;
  maxMobileHeight?: string;
  mobileSkeletonCount?: number;
  tableSkeletonRows?: number;
  /** Show the "Showing N x" footer on mobile. Default true. */
  showMobileCount?: boolean;
  /** Full toolbar JSX — search, filters, add button, etc. */
  renderToolbar: () => ReactNode;
  /** Render a mobile card for the given item. */
  renderMobileCard: (item: T, index: number) => ReactNode;
  /** Render a <tr> for the given item. */
  renderDesktopRow: (item: T, index: number) => ReactNode;
}

/**
 * Reusable layout shell that abstracts the shared table + mobile-card pattern:
 * toolbar, loading skeletons, error state, infinite-scroll containers
 * (mobile + desktop), empty states, and count footers.
 *
 * Only the column definitions, data items, and row/card render functions
 * are delegated to the caller — everything else (sentinels, scroll refs,
 * skeleton wiring, dark-mode classes) lives here.
 */
export default function TableShell<T>({
  columns,
  data,
  isLoading,
  isError,
  error,
  entityName,
  emptyMessage,
  hasNextPage,
  isFetchingNextPage,
  mobileScrollRef,
  mobileSentinelRef,
  desktopScrollRef,
  desktopSentinelRef,
  maxTableHeight = "560px",
  maxMobileHeight = "520px",
  mobileSkeletonCount = 5,
  tableSkeletonRows = 8,
  showMobileCount = true,
  renderToolbar,
  renderMobileCard,
  renderDesktopRow,
}: TableShellProps<T>) {
  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      {renderToolbar()}

      {/* ── Loading state ── */}
      {isLoading && (
        <>
          <div className="md:hidden">
            <MobileCardSkeleton maxHeight={maxMobileHeight} count={mobileSkeletonCount} />
          </div>
          <TableSkeleton
            maxHeight={maxTableHeight}
            scrollbarClassName={THIN_SCROLLBAR}
            columns={columns}
            rows={tableSkeletonRows}
          />
        </>
      )}

      {/* ── Error state ── */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/10 px-5 py-10 text-center text-red-600 text-theme-sm">
          Failed to load {entityName}
          {error instanceof Error ? `: ${error.message}` : "."}
        </div>
      )}

      {/* ── Data (mobile + desktop) ── */}
      {!isLoading && !isError && (
        <>
          {/* ── Mobile cards (< md) ── */}
          <div className="md:hidden space-y-3">
            <div
              ref={mobileScrollRef}
              className={`overflow-y-auto space-y-3 pr-1 ${THIN_SCROLLBAR}`}
              style={{ height: maxMobileHeight, overflowAnchor: "none" }}
            >
              {data.length === 0 ? (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] px-5 py-10 text-center text-gray-400 text-theme-sm">
                  {emptyMessage}
                </div>
              ) : (
                <>
                  {data.map((item, index) => renderMobileCard(item, index))}
                  <div ref={mobileSentinelRef} className="h-px" />
                  {isFetchingNextPage && (
                    <p className="text-center text-theme-xs text-gray-400 py-2">
                      Loading more…
                    </p>
                  )}
                  {!hasNextPage && (
                    <p className="text-center text-theme-xs text-gray-300 dark:text-gray-600 py-2">
                      No more {entityName}
                    </p>
                  )}
                </>
              )}
            </div>

            {showMobileCount && data.length > 0 && (
              <p className="text-theme-xs text-gray-400 dark:text-gray-500 text-right px-1">
                Showing{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {data.length}
                </span>{" "}
                {entityName}
              </p>
            )}
          </div>

          {/* ── Desktop table (≥ md) ── */}
          <div className="hidden md:flex md:flex-col rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] overflow-hidden">
            <div className="w-full overflow-x-auto">
              <div
                ref={desktopScrollRef}
                className={`overflow-y-auto ${THIN_SCROLLBAR}`}
                style={{ height: maxTableHeight, overflowAnchor: "none" }}
              >
                <Table>
                  <TableHeader className="dark:border-white/[0.05] sticky top-0 z-10 bg-white dark:bg-gray-900">
                    <TableRow>
                      {columns.map((col) => (
                        <TableCell
                          key={col.label}
                          isHeader
                          className="px-4 py-3 font-semibold text-primary text-start text-theme-xs dark:text-gray-300 whitespace-nowrap"
                        >
                          {col.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHeader>

                  <TableBody className="dark:divide-white/[0.05]">
                    {data.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="px-5 py-10 text-center text-gray-400 text-theme-sm"
                        >
                          {emptyMessage}
                        </td>
                      </tr>
                    ) : (
                      data.map((item, index) => renderDesktopRow(item, index))
                    )}

                    {data.length > 0 && (
                      <tr>
                        <td colSpan={columns.length} className="h-px p-0">
                          <div ref={desktopSentinelRef} className="h-px" />
                        </td>
                      </tr>
                    )}
                    {isFetchingNextPage && (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="px-4 py-3 text-center text-theme-xs text-gray-400"
                        >
                          Loading more…
                        </td>
                      </tr>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {data.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.05]">
                <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {data.length}
                  </span>{" "}
                  {entityName}
                  {!hasNextPage && " (all loaded)"}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import Skeleton from "react-loading-skeleton";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../ui/table";

export interface TableSkeletonColumn {
  /** Header label shown above the skeleton column (keeps header layout stable while loading). */
  label: string;
  /** Tailwind width class for the skeleton bar in this column, e.g. "w-32". Defaults to "w-24". */
  width?: string;
  /**
   * Render a second, shorter line under the first (e.g. name + title/subtitle stacks).
   * Defaults to false.
   */
  withSubline?: boolean;
  /** Render the skeleton as a pill/badge shape instead of a bar. Defaults to false. */
  pill?: boolean;
}

export interface TableSkeletonProps {
  /** Column definitions — same count/order as your real table's headers. */
  columns: TableSkeletonColumn[];
  /** Number of placeholder rows to render. Defaults to 8. */
  rows?: number;
  /**
   * Max height of the scrollable body — pass the SAME value used for the real
   * table (e.g. `maxTableHeight`) so the loading state occupies identical
   * space and nothing shifts once data arrives.
   */
  maxHeight?: string;
  /** Extra class names for the thin-scrollbar wrapper, if your app uses a custom scrollbar utility. */
  scrollbarClassName?: string;
}

/**
 * Generic, reusable loading state for any table built on the shared
 * Table / TableHeader / TableBody / TableRow / TableCell primitives.
 *
 * Usage:
 *   <TableSkeleton
 *     maxHeight={maxTableHeight}
 *     columns={[
 *       { label: "Name", width: "w-32", withSubline: true },
 *       { label: "Role", width: "w-16", pill: true },
 *       { label: "Email", width: "w-40" },
 *       { label: "Division", width: "w-20" },
 *       { label: "Account Status", width: "w-16" },
 *       { label: "Action", width: "w-6" },
 *     ]}
 *   />
 */
export default function TableSkeleton({
  columns,
  rows = 8,
  maxHeight,
  scrollbarClassName = "",
}: TableSkeletonProps) {
  return (
    <div className="hidden md:flex md:flex-col rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] overflow-hidden">
      <div className="w-full overflow-x-auto">
        <div
          className={`overflow-y-auto ${scrollbarClassName}`}
          style={{ height: maxHeight }}
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
              {Array.from({ length: rows }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((col, colIndex) => (
                    <TableCell key={colIndex} className="px-4 py-3">
                      {col.pill ? (
                        <Skeleton
                          className={`h-5 ${col.width ?? "w-16"}`}
                          rounded="rounded-full"
                        />
                      ) : (
                        <div className="space-y-1.5">
                          <Skeleton className={`h-3.5 ${col.width ?? "w-24"}`} />
                          {col.withSubline && (
                            <Skeleton
                              className={`h-3 ${col.width ?? "w-24"} opacity-70`}
                            />
                          )}
                        </div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

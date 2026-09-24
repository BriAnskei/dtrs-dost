import Skeleton from "react-loading-skeleton";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../ui/table";

export interface TableSkeletonColumn {
  label: string;
  width?: string;
  withSubline?: boolean;
  pill?: boolean;
}

export interface TableSkeletonProps {
  columns: TableSkeletonColumn[];
  rows?: number;
  maxHeight?: string;
  scrollbarClassName?: string;
}

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
            <TableHeader className="dark:border-white/[0.05] sticky top-0 z-10 bg-[#f1f5f9] dark:bg-gray-900">
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

import Skeleton from "react-loading-skeleton";

export interface MobileCardSkeletonProps {
  /** Number of placeholder cards to render. Defaults to 5. */
  count?: number;
  /**
   * Max height of the scrollable list — pass the SAME value used for the
   * real list (e.g. `maxMobileHeight`) so nothing shifts once data arrives.
   */
  maxHeight?: string;
  /** Extra class names for the thin-scrollbar wrapper, if your app uses a custom scrollbar utility. */
  scrollbarClassName?: string;
}

/**
 * Generic, reusable loading state for card-list views (the mobile
 * counterpart to TableSkeleton). Mirrors a typical row card: a name +
 * subtitle stack, a status/role pill, and a trailing action affordance.
 *
 * Usage:
 *   <MobileCardSkeleton maxHeight={maxMobileHeight} count={5} />
 */
export default function MobileCardSkeleton({
  count = 5,
  maxHeight,
  scrollbarClassName = "",
}: MobileCardSkeletonProps) {
  return (
    <div
      className={`overflow-y-auto space-y-3 pr-1 ${scrollbarClassName}`}
      style={{ height: maxHeight }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] px-4 py-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/3 opacity-70" />
            </div>
            <Skeleton className="h-5 w-5 shrink-0" rounded="rounded-md" />
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Skeleton className="h-5 w-16" rounded="rounded-full" />
            <Skeleton className="h-3 w-20 opacity-70" />
          </div>

          <div className="mt-3 space-y-1.5">
            <Skeleton className="h-3 w-3/4 opacity-70" />
            <Skeleton className="h-3 w-1/2 opacity-70" />
          </div>
        </div>
      ))}
    </div>
  );
}

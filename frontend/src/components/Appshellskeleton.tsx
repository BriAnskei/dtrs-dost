import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/**
 * AppShellSkeleton
 * ------------------------------------------------------------------
 * Shown while the user session is being resolved (e.g. inside
 * ProtectedRoute before `user` is known). Mirrors the real
 * AppSidebar + Header + dashboard content layout 1:1 so there's no
 * layout shift / flash when the real AppLayout mounts underneath it.
 *
 * Usage (in ProtectedRoute):
 *
 *   if (user.loading) return <AppShellSkeleton />;
 */

const NAV_GROUPS = [
  { label: true, items: 4 },
  { label: true, items: 3 },
];

export default function AppShellSkeleton() {
  return (
    <SkeletonTheme baseColor="#e5e7eb" highlightColor="#f3f4f6">
      <div className="min-h-screen xl:flex" aria-busy="true" aria-live="polite">
        {/* ── Sidebar ─────────────────────────────────────────── */}
        <aside
          className="fixed left-0 top-0 hidden h-screen w-[220px] flex-col border-r border-gray-200 bg-sidebar px-5 lg:flex"
          style={{ backgroundColor: "#0f172a" }}
        >
          {/* Logo row */}
          <div className="flex items-center gap-2 py-4">
            <Skeleton
              circle
              width={36}
              height={36}
              baseColor="#1e293b"
              highlightColor="#334155"
            />
            <Skeleton
              width={110}
              height={16}
              baseColor="#1e293b"
              highlightColor="#334155"
            />
          </div>

          {/* Nav groups */}
          <nav className="mt-2 flex flex-col gap-6">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className="flex flex-col gap-3">
                <Skeleton
                  width={50}
                  height={10}
                  baseColor="#1e293b"
                  highlightColor="#334155"
                />
                {Array.from({ length: group.items }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton
                      width={20}
                      height={20}
                      baseColor="#1e293b"
                      highlightColor="#334155"
                    />
                    <Skeleton
                      width={i % 2 === 0 ? 120 : 90}
                      height={12}
                      baseColor="#1e293b"
                      highlightColor="#334155"
                    />
                  </div>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Main column ─────────────────────────────────────── */}
        <div className="flex-1 lg:ml-[220px]">
          {/* Header */}
          <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
            <div className="hidden lg:block">
              <Skeleton width={430} height={40} borderRadius={8} />
            </div>
            <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-end">
              <Skeleton circle width={24} height={24} />
              <Skeleton circle width={36} height={36} />
              <Skeleton circle width={36} height={36} />
            </div>
          </header>

          {/* Content */}
          <div className="mx-auto max-w-(--breakpoint-2xl) p-2 md:p-6">
            {/* Greeting */}
            <div className="mb-4 space-y-2">
              <Skeleton width={220} height={22} />
              <Skeleton width={280} height={14} />
            </div>

            {/* Attention strip */}
            <Skeleton height={64} borderRadius={12} className="mb-4" />

            {/* Tab pills */}
            <div className="mb-4 flex w-fit gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
              <Skeleton width={90} height={28} borderRadius={6} />
              <Skeleton width={90} height={28} borderRadius={6} />
            </div>

            {/* Metric cards */}
            <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} height={90} borderRadius={12} />
              ))}
            </div>

            {/* Analytics + side column */}
            <div className="grid grid-cols-12 gap-4 md:gap-6">
              <div className="col-span-12 xl:col-span-8">
                <Skeleton height={320} borderRadius={12} />
              </div>
              <div className="col-span-12 flex flex-col gap-4 xl:col-span-4">
                <Skeleton height={150} borderRadius={12} />
                <Skeleton height={150} borderRadius={12} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
}

// pages/Dashboard/AdminDashboard.tsx
import { useState } from "react";
import AdminMetrics from "../../components/admin/AdminMetrix";
import AnalyticsSection from "../../components/admin/AnalyticsSection";
import NeedsAttentionStrip from "../../components/admin/NeedsAttention";
import QuickActions from "../../components/admin/QuickActions";
import RecentActivity from "../../components/admin/RecentActivity";
import StaleDocumentsSummary from "../../components/admin/StaleDocumentsSummary";
import PageMeta from "../../components/common/PageMeta";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Reduced from 3 tabs to 2: Quick Actions and Stale Documents don't meet the
// bar for hiding content behind a tab (short, frequently-needed content per
// NN/g's tab-usage heuristic). Activity remains separate since it's a growing
// log users don't need to see simultaneously with the KPI/chart view.
const TABS = ["Overview", "Activity"] as const;
type Tab = (typeof TABS)[number];

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("Overview");

  return (
    <>
      <PageMeta
        title="Admin Dashboard | Document Tracking System"
        description="Monitor system-wide document flow, validation queue, and division workload across the Provincial Engineer's Office."
      />
      {/* Fills the parent route container's height — no page-level scroll */}
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        {/* ── Pinned zone: greeting + attention strip ───────────────── */}
        <div className="flex-shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-text dark:text-white/90">
                {greeting()}, user_name
              </h1>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                Here's what needs your attention today.
              </p>
            </div>
          </div>
          <NeedsAttentionStrip />
        </div>

        {/* ── Tab pills ──────────────────────────────────────────────── */}
        <div className="flex-shrink-0 inline-flex w-fit rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-white/[0.05] dark:bg-white/[0.02]">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-theme-sm font-medium transition ${
                tab === t
                  ? "bg-white text-primary shadow-theme-xs dark:bg-white/10 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── Tab content — fills remaining height, no internal scroll ─ */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "Overview" && (
            <div className="flex h-full flex-col gap-4">
              <div className="flex-shrink-0">
                <AdminMetrics />
              </div>
              {/* 12-col grid, consistent with the rest of the app.
                  Analytics gets primary weight (left, 8 cols); Quick Actions
                  and Stale Documents live in a secondary column (4 cols) so
                  they're always visible instead of gated behind a tab click. */}
              <div className="grid min-h-0 flex-1 grid-cols-12 gap-4 overflow-hidden md:gap-6">
                <div className="col-span-12 min-h-0 xl:col-span-8">
                  <AnalyticsSection />
                </div>
                <div className="col-span-12 flex min-h-0 flex-col gap-4 overflow-y-auto xl:col-span-4">
                  <StaleDocumentsSummary />
                  <QuickActions />
                </div>
              </div>
            </div>
          )}
          {tab === "Activity" && (
            <div className="h-full">
              <RecentActivity />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

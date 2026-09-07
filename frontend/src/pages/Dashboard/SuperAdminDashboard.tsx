// pages/SuperAdminDashboard.tsx
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import SystemDocumentOverview from "../../components/super_admin/SuperAdminDocumentOverview";
import SuperAdminUserStats from "../../components/super_admin/SuperAdminUserStats";
import SystemLogsPreview from "../../components/super_admin/SystemLogsPreview";
import UserActivityFeed from "../../components/super_admin/UserActivityFeed";

export default function SuperAdminDashboard() {
  return (
    <>
      <PageMeta
        title="Super Admin Dashboard | Document Tracking System"
        description="Full system visibility — user statistics, document overview, live activity feed, and audit logs."
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* ── User Stats ── */}
        <div className="col-span-12">
          <SuperAdminUserStats />
        </div>

        {/* ── System Document Overview (full width area chart) ── */}
        <div className="col-span-12">
          <SystemDocumentOverview />
        </div>

        {/* ── User Activity + System Logs ── */}
        <div className="col-span-12 xl:col-span-5">
          <UserActivityFeed />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <SystemLogsPreview />
        </div>
      </div>
    </>
  );
}

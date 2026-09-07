import NeedsAttentionStrip from "../../components/admin/NeedsAttention";
import PageMeta from "../../components/common/PageMeta";
import DocumentStatusChart from "../../components/receiver/DocumentStatusChart";
import ReceiverMetrics from "../../components/receiver/MetricCard";
import RecentUploads from "../../components/receiver/RecentUploads";
import UploadActivityCard from "../../components/receiver/UploadActivityCard";

export default function ReceiverDashboard() {
  return (
    <>
      <PageMeta
        title="My Dashboard | Document Tracking System"
        description="View and manage all documents you've uploaded — track status, review history, and monitor upload activity."
      />

      <div className="space-y-4">
        <NeedsAttentionStrip />

        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* ── Metrics Row ── */}
          <div className="col-span-12">
            <ReceiverMetrics />
          </div>

          {/* ── Upload Activity + Status Breakdown ── */}
          <div className="col-span-12 xl:col-span-7">
            <UploadActivityCard />
          </div>

          <div className="col-span-12 xl:col-span-5">
            <DocumentStatusChart />
          </div>

          {/* ── Recent Uploads full-width ── */}
          <div className="col-span-12">
            <RecentUploads />
          </div>
        </div>
      </div>
    </>
  );
}

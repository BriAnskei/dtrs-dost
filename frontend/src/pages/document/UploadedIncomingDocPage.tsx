// ─── MyUploadsPage.tsx ────────────────────────────────────────────────────────

import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import UploadedIncomingDocTable from "./components/UploadedIncomingDocTable";

export default function UploadedIncomingDocPage() {
  return (
    <>
      <PageMeta
        title="My Uploads | Document Tracking System"
        description="View and manage your submitted documents and their validation status."
      />
      <PageBreadcrumb pageTitle="My Uploads" />
      <div className="space-y-6">
        <ComponentCard title="My Uploads">
          <UploadedIncomingDocTable />
        </ComponentCard>
      </div>
    </>
  );
}

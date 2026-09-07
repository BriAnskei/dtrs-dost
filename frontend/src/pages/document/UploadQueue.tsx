import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import UploadQueueTable from "../../components/tables/UploadQueueTable";

export default function UploadQueue() {
  return (
    <>
      <PageMeta
        title="Validation Queue | Document Tracking System"
        description="Review and validate uploaded documents before they enter the tracking system."
      />
      <PageBreadcrumb pageTitle="Validation Queue" />
      <div className="space-y-6">
        <ComponentCard title="Validation Queue">
          <UploadQueueTable />
        </ComponentCard>
      </div>
    </>
  );
}

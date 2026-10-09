import ComponentCard from "../../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import PageMeta from "../../../../components/common/PageMeta";
import ExtractedQueueTable from "./ExtractedQueueTable";

export default function ExtractedQueuePage() {
  return (
    <>
      <PageMeta
        title="Extraction Queue | Document Tracking System"
        description="Review uploaded documents, then accept or invalidate their extraction results."
      />
      <PageBreadcrumb pageTitle="Extracted Document Queues" />
      <div className="space-y-6">
        <ComponentCard>
          <ExtractedQueueTable />
        </ComponentCard>
      </div>
    </>
  );
}

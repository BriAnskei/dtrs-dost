import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import InvalidDocumentsTable from "../../components/tables/InvalidDocumentsTabe";

export default function InvalidDocumentPage() {
  return (
    <>
      <PageMeta
        title="Invalid Documents | Document Tracking System"
        description="View and manage documents that were rejected by admin review. Revier and resubmit."
      />
      <PageBreadcrumb pageTitle="Invalid Documents" />
      <div className="space-y-6">
        <ComponentCard
          title="Invalid Documents"
          desc="Documents Invalid by admin review. View details, and resubmit."
        >
          <InvalidDocumentsTable />
        </ComponentCard>
      </div>
    </>
  );
}

import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import InvalidDocumentsTable from "../../components/tables/InvalidDocumentsTabe";

export default function InvalidDocumentPage() {
  return (
    <>
      <PageMeta
        title="Invalid Documents | Document Tracking System"
        description="View documents with missing or incomplete metadata that were flagged during AI processing."
      />
      <PageBreadcrumb pageTitle="Invalid Documents" />
      <div className="space-y-6">
        <ComponentCard
          title="Invalid Documents"
          desc="Documents flagged by AI for missing or incomplete metadata. Review and resubmit with corrections."
        >
          <InvalidDocumentsTable />
        </ComponentCard>
      </div>
    </>
  );
}

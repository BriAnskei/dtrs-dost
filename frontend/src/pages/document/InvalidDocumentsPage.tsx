import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import InvalidDocumentsTable from "../../components/tables/InvalidDocumentsTable";

export default function InvalidDocumentsPage() {
  return (
    <>
      <PageMeta
        title="Invalid Documents | Document Tracking System"
        description="Review and handle documents with missing or incomplete metadata."
      />
      <PageBreadcrumb pageTitle="Invalid Documents" />
      <div className="space-y-6">
        <ComponentCard
          title="Invalid Documents"
          desc="Documents with missing or incomplete metadata that require manual review."
        >
          <InvalidDocumentsTable />
        </ComponentCard>
      </div>
    </>
  );
}

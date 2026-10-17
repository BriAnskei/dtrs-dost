import ComponentCard from "../../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import PageMeta from "../../../../components/common/PageMeta";
import IncomingDocumentsTable from "./IncomingDocumentTable";

export default function IncomingDocumentsPage() {
  return (
    <>
      <PageMeta
        title="Incoming Documents | Document Tracking System"
        description="Browse incoming documents — search, filter by status and date, and sort."
      />
      <PageBreadcrumb pageTitle="Incoming Documents" />
      <div className="space-y-6">
        <ComponentCard>
          <IncomingDocumentsTable />
        </ComponentCard>
      </div>
    </>
  );
}

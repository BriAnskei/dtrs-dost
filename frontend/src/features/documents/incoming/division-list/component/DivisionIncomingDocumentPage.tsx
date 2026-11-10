import ComponentCard from "../../../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../../../components/common/PageBreadCrumb";
import PageMeta from "../../../../../components/common/PageMeta";
import DivisionIncomingDocumentsTable from "./DivisionIncomingDocumentTable";

export default function DivisionIncomingDocumentsPage() {
  return (
    <>
      <PageMeta
        title="Division Incoming Documents | Document Tracking System"
        description="Browse incoming documents routed to your division — search, filter by status and date routed, and sort."
      />
      <PageBreadcrumb pageTitle="Division Incoming Documents" />
      <div className="space-y-6">
        <ComponentCard>
          <DivisionIncomingDocumentsTable />
        </ComponentCard>
      </div>
    </>
  );
}

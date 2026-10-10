import ComponentCard from "../../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../../components/common/PageBreadCrumb";
import PageMeta from "../../../../components/common/PageMeta";
import MyUploadedDocumentsTable from "./MyUploadedDocumentsTable";

export default function MyUploadedDocumentsPage() {
  return (
    <>
      <PageMeta
        title="My Uploaded Documents | Document Tracking System"
        description="Track the decision and admin response for the documents you uploaded."
      />
      <PageBreadcrumb pageTitle="My Uploaded Documents" />
      <div className="space-y-6">
        <ComponentCard>
          <MyUploadedDocumentsTable />
        </ComponentCard>
      </div>
    </>
  );
}

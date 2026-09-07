// ─── DocumentUploadPage.tsx ───────────────────────────────────────────────────

import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import IncomingDocumentForm from "./components/IncomingDocumentForm";

export default function IncomingDocumentUploadPage() {
  return (
    <>
      <PageMeta
        title="Upload Document | Document Tracking System"
        description="Submit a document for validation before it enters the tracking system."
      />
      <PageBreadcrumb pageTitle="Upload Document" />
      <div className="space-y-6">
        <ComponentCard title="Submit Document for Validation">
          <IncomingDocumentForm />
        </ComponentCard>
      </div>
    </>
  );
}

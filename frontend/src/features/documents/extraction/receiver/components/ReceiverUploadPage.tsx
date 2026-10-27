import ComponentCard from "../../../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../../../components/common/PageBreadCrumb";
import PageMeta from "../../../../../components/common/PageMeta";
import ReceiverUploadPanel from "./ReceiverUploadPanel";

export default function ReceiverUploadPage() {
  return (
    <>
      <PageMeta
        title="Upload Document | Document Tracking System"
        description="Upload an incoming PDF to be extracted and queued for admin validation."
      />
      <PageBreadcrumb pageTitle="Upload Incoming Document" />
      <div className="space-y-6">
        <ComponentCard>
          <ReceiverUploadPanel />
        </ComponentCard>
      </div>
    </>
  );
}

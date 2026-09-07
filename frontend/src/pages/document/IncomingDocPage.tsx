import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import IncomingDocumentsTable from "../../components/tables/IncomingDocumentsTable";

export default function IncomingDocPage() {
  return (
    <>
      <PageMeta
        title="Incoming Documents | Document Tracking System"
        description="Manage and track all incoming documents — view, update status, and audit changes."
      />
      <PageBreadcrumb pageTitle="Incoming Documents" />
      <div className="space-y-6">
        <ComponentCard
          title="Incoming Documents"
          headerRight={
            <button
              onClick={() => setAuditLogOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-theme-xs font-medium text-[#475569] border border-[#e2e8f0] bg-white hover:bg-gray-50 transition-colors"
              title="View audit log"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Audit Log
            </button>
          }
        >
          <IncomingDocumentsTable />
        </ComponentCard>
      </div>
    </>
  );
}

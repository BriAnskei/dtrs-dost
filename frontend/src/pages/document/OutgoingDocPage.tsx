import { useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import OutgoingDocumentsTable from "../../components/tables/OutgoingDocumentsTable";

export default function OutgoingDocPage() {
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  return (
    <>
      <PageMeta
        title="Outgoing Documents | Document Tracking System"
        description="Manage and track all outgoing documents — view, update status, and audit changes."
      />
      <PageBreadcrumb pageTitle="Outgoing Documents" />
      <div className="space-y-6">
        <ComponentCard
          title="Outgoing Documents"
          headerRight={
            <button
              onClick={() => setAuditLogOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-theme-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] hover:bg-gray-50 dark:hover:bg-white/[0.06] hover:text-primary dark:hover:text-secondary hover:border-primary/30 dark:hover:border-secondary/30 transition-colors"
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
          <OutgoingDocumentsTable />
        </ComponentCard>
      </div>
    </>
  );
}

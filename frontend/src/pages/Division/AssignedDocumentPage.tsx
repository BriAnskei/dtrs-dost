import { useMemo, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import IncomingStatusMetrics from "../../components/division/IncommingStatusMetrics";
import DivisionIncomingDocumentsTable, {
  type IncomingDocument,
} from "../../components/tables/Division/AssigendDocumentsTable";
import type { StatusType } from "../../components/ui/modal/document/StatusUpdateModal";

// TODO: replace with the logged-in user's division (e.g. from an auth/session context)
const CURRENT_DIVISION = "Maintenance Division";

const mockData: IncomingDocument[] = [
  {
    id: 1,
    code: "INC-2024-001",
    subject: "Budget Proposal FY2024",
    from: "Finance Department",
    to: "Executive Office",
    routedDivisions: ["Finance Division", "Office of the Provincial Engineer"],
    status: "Completed",
    fileUrl: "/files/budget-proposal-2024.pdf",
    dateReceived: "2024-01-10",
  },
  {
    id: 2,
    code: "INC-2024-002",
    subject: "Infrastructure Maintenance Request",
    from: "Facilities Management",
    to: "Operations Division",
    routedDivisions: ["Maintenance Division"],
    status: "On-Going",
    fileUrl: "/files/maintenance-request.pdf",
    dateReceived: "2024-01-14",
  },
  {
    id: 3,
    code: "INC-2024-003",
    subject: "Staff Regularization Endorsement",
    from: "HR Department",
    to: "Director's Office",
    routedDivisions: ["Human Resources Division", "Legal Division"],
    status: "Pending",
    fileUrl: "/files/regularization-endorsement.pdf",
    dateReceived: "2024-01-18",
  },
  {
    id: 4,
    code: "INC-2024-004",
    subject: "Road Widening Culvert Repair",
    from: "Administrative Office",
    to: "Maintenance Division",
    routedDivisions: ["Maintenance Division"],
    status: "Pending",
    fileUrl: "/files/culvert-repair.pdf",
    dateReceived: "2024-01-22",
  },
  {
    id: 5,
    code: "INC-2024-005",
    subject: "Streetlight Replacement Backlog",
    from: "Barangay Office",
    to: "Maintenance Division",
    routedDivisions: ["Maintenance Division"],
    status: "Completed",
    fileUrl: "/files/streetlight-backlog.pdf",
    dateReceived: "2024-01-25",
  },
  {
    id: 6,
    code: "INC-2024-006",
    subject: "Legal Compliance Audit Report",
    from: "Legal Affairs",
    to: "Compliance Office",
    routedDivisions: ["Legal Division", "Administrative Division"],
    status: "On-Going",
    fileUrl: "/files/audit-report.pdf",
    dateReceived: "2024-02-01",
  },
];

export default function AssignedDocumentPage() {
  const [allRecords, setAllRecords] = useState<IncomingDocument[]>(mockData);
  const [statusFilter, setStatusFilter] = useState<StatusType | "All">("All");

  // Scope to this division's assigned documents only
  const divisionRecords = useMemo(
    () => allRecords.filter((r) => r.routedDivisions.includes(CURRENT_DIVISION)),
    [allRecords],
  );

  const metrics = useMemo(() => {
    const completed = divisionRecords.filter((r) => r.status === "Completed").length;
    const onGoing = divisionRecords.filter((r) => r.status === "On-Going").length;
    const pending = divisionRecords.filter((r) => r.status === "Pending").length;
    return { total: divisionRecords.length, completed, onGoing, pending };
  }, [divisionRecords]);

  function handleRecordsChange(updated: IncomingDocument[]) {
    // Merge updated division records back into the full dataset
    setAllRecords((prev) => prev.map((r) => updated.find((u) => u.id === r.id) ?? r));
  }

  return (
    <>
      <PageMeta
        title="Assigned Documents | Document Tracking System"
        description="Track documents routed to your division — update status and routing."
      />

      <div className="space-y-6">
        <IncomingStatusMetrics
          total={metrics.total}
          completed={metrics.completed}
          onGoing={metrics.onGoing}
          pending={metrics.pending}
          activeStatus={statusFilter}
          onSelect={setStatusFilter}
        />

        <ComponentCard title={`Assigned Documents — ${CURRENT_DIVISION}`}>
          <DivisionIncomingDocumentsTable
            division={CURRENT_DIVISION}
            records={divisionRecords}
            onRecordsChange={handleRecordsChange}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </ComponentCard>
      </div>
    </>
  );
}

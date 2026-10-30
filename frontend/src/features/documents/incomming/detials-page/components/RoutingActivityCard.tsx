import { ClipboardList, Clock, GitBranch, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatDateTime } from "../../../../../utils/dateFormatter";
import type { IncomingDocumentDetails } from "../../types/incoming-document-details.type";
import DetailsCard from "./DetialsCard";

function ControlRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500 dark:bg-white/5 dark:text-gray-400">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-theme-xs text-gray-400 dark:text-gray-500">{label}</dt>
        <dd className="mt-0.5 text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {value}
          {hint && (
            <span className="mt-0.5 block text-theme-xs font-normal text-gray-500 dark:text-gray-400">
              {hint}
            </span>
          )}
        </dd>
      </div>
    </div>
  );
}

export default function RoutingActivityCard({
  doc,
}: {
  doc: Pick<
    IncomingDocumentDetails,
    "assigned_division_count" | "assignments" | "updated_at"
  >;
}) {
  return (
    <DetailsCard eyebrow="Routing & activity">
      <dl className="space-y-4">
        {doc.assigned_division_count > 0 && (
          <ControlRow
            icon={GitBranch}
            label="Routed divisions"
            value={doc.assigned_division_count.toLocaleString()}
            hint="Divisions this document is routed to"
          />
        )}

        {doc.assignments > 0 && (
          <ControlRow
            icon={ClipboardList}
            label="Assignments"
            value={doc.assignments.toLocaleString()}
            hint="Notices of action for the main office and division"
          />
        )}

        <ControlRow
          icon={Clock}
          label="Last updated"
          value={formatDateTime(doc.updated_at)}
        />
      </dl>
    </DetailsCard>
  );
}

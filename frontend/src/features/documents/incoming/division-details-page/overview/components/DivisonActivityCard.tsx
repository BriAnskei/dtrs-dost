import { ClipboardList, Clock, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatDateTime } from "../../../../../../utils/dateFormatter";
import DetailsCard from "../../../detials-page/overview/component/DetialsCard";

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
      <dl className="min-w-0">
        <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</dt>
        <dd className="mt-0.5 text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {value}
        </dd>
        {hint && (
          <dd className="mt-0.5 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
            {hint}
          </dd>
        )}
      </dl>
    </div>
  );
}

interface DivisionActivityCardProps {
  totalAssignments: number;
  updatedAt: string;
}

export default function DivisionActivityCard({
  totalAssignments,
  updatedAt,
}: DivisionActivityCardProps) {
  return (
    <DetailsCard eyebrow="Activity">
      <div className="space-y-4">
        <ControlRow
          icon={ClipboardList}
          label="Assignments"
          value={totalAssignments.toLocaleString()}
          hint={
            totalAssignments === 0
              ? "Not yet assigned to your division"
              : "Assigned to your division"
          }
        />
        <ControlRow icon={Clock} label="Last updated" value={formatDateTime(updatedAt)} />
      </div>
    </DetailsCard>
  );
}

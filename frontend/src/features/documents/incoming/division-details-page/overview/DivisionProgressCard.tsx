import DetailsCard from "../../detials-page/overview/component/DetialsCard";

export interface DivisionAssignmentProgress {
  /** All assignments routed to this division. */
  total: number;
  /** Assignments still ongoing. */
  ongoing: number;
  /** Assignments completed. */
  complete: number;
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 dark:bg-white/3">
      <dt className="text-theme-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold text-gray-800 dark:text-white/90">
        {value.toLocaleString()}
      </dd>
      <dd className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">{hint}</dd>
    </div>
  );
}

export default function DivisionProgressCard({
  progress,
}: {
  progress: DivisionAssignmentProgress;
}) {
  const { ongoing, complete } = progress;

  if (ongoing === 0 && complete === 0) return null;

  return (
    <DetailsCard eyebrow="Your division's progress">
      <dl className="grid grid-cols-2 gap-3">
        <StatTile label="Ongoing" value={ongoing} hint="Still being worked on" />
        <StatTile label="Complete" value={complete} hint="Action completed" />
      </dl>
    </DetailsCard>
  );
}

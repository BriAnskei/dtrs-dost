import DetailsCard from "../../DetialsCard";

export interface ActionProgress {
  /** Assignments with no action taken yet. */
  inProgress: number;
  /** Assignments with an action taken. */
  actionTaken: number;
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

export default function ActionProgressCard({ progress }: { progress: ActionProgress }) {
  const { inProgress, actionTaken } = progress;

  if (inProgress === 0 && actionTaken === 0) return null;

  return (
    <DetailsCard eyebrow="Action progress">
      <dl className="grid grid-cols-2 gap-3">
        <StatTile
          label="In progress"
          value={progress.inProgress}
          hint="No action taken yet"
        />
        <StatTile
          label="Action taken"
          value={progress.actionTaken}
          hint="Action recorded"
        />
      </dl>
    </DetailsCard>
  );
}

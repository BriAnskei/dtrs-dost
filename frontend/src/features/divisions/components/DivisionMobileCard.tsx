import type { Division } from "../type/division.type";
import EditableDivisionName from "./EditableDivisionName";
import UserAvatarStack from "./UserAvatarStack";

interface DivisionMobileCardProps {
  division: Division;
  onView: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

export default function DivisionMobileCard({
  division,
  onView,
  onRename,
  onDelete,
}: DivisionMobileCardProps) {
  const canDelete = division.userCount === 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <EditableDivisionName name={division.name} onSave={onRename} />
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {division.userCount} user{division.userCount === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={!canDelete}
          title={
            canDelete ? "Delete division" : "Can't delete — division still has users"
          }
          className={`text-theme-xs shrink-0 ${
            canDelete
              ? "text-danger hover:underline"
              : "text-gray-300 dark:text-gray-600 cursor-not-allowed"
          }`}
        >
          Delete
        </button>
      </div>
      <UserAvatarStack users={division.users} onClick={onView} />
    </div>
  );
}

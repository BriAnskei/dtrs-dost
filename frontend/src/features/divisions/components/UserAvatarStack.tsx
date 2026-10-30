import UserAvatar from "../../../components/common/UserAvatar";
import type { DivisionUser } from "../type/division.type";

interface UserAvatarStackProps {
  users: DivisionUser[];
  max?: number;
  onClick?: () => void;
}

export default function UserAvatarStack({
  users,
  max = 4,
  onClick,
}: UserAvatarStackProps) {
  if (users.length === 0) {
    return (
      <span className="text-theme-xs text-gray-400 dark:text-gray-500 italic">
        No users
      </span>
    );
  }

  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center -space-x-2 group"
      title={`View ${users.length} user${users.length === 1 ? "" : "s"}`}
    >
      {visible.map((u) => (
        <UserAvatar
          key={u.id}
          name={u.fullName}
          size="sm"
          className="ring-2 ring-white dark:ring-gray-900"
        />
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 ring-2 ring-white dark:bg-white/[0.06] dark:text-gray-400 dark:ring-gray-900">
          +{overflow}
        </span>
      )}
      <span className="ml-3 text-theme-xs text-gray-400 group-hover:text-secondary transition-colors dark:text-gray-500">
        View all
      </span>
    </button>
  );
}

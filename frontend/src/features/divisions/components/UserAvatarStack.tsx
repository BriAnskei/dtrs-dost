import type { DivisionUser } from "../type/division.type";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

const PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[hash];
}

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
        <span
          key={u.id}
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold ring-2 ring-white dark:ring-gray-900 ${colorFor(
            u.fullName,
          )}`}
        >
          {initials(u.fullName)}
        </span>
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

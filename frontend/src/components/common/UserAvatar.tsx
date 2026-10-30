import { User } from "lucide-react";
import { getInitials } from "../../features/documents/incomming/detials-page/person-label";

const PALETTE = [
  "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
];

const UNKNOWN_TONE = "bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-gray-500";

/** Same name → same colour, every time. */
function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = (hash + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[hash];
}

const SIZE = {
  xs: { box: "h-5 w-5 text-[9px]", icon: "h-3 w-3" },
  sm: { box: "h-7 w-7 text-[10px]", icon: "h-3.5 w-3.5" },
  md: { box: "h-9 w-9 text-theme-xs", icon: "h-4 w-4" },
} as const;

export type UserAvatarSize = keyof typeof SIZE;

interface UserAvatarProps {
  /** Full name, or null for an unknown/removed user (shows a neutral icon). */
  name: string | null | undefined;
  size?: UserAvatarSize;
  className?: string;
}

/**
 * Initials avatar. Decorative: the person's name should always appear as text
 * next to it, so it is hidden from screen readers.
 */
export default function UserAvatar({
  name,
  size = "sm",
  className = "",
}: UserAvatarProps) {
  const initials = getInitials(name);
  const tone = initials && name ? colorFor(name) : UNKNOWN_TONE;

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold ${SIZE[size].box} ${tone} ${className}`}
    >
      {initials || <User className={SIZE[size].icon} />}
    </span>
  );
}

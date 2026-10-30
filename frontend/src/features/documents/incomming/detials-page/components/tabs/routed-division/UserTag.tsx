import UserAvatar from "../../../../../../../components/common/UserAvatar";

interface UserTagProps {
  /** `null` when the user was removed (the entity's foreign keys are SET NULL). */
  person: { name: string; position: string | null } | null;
  /** `xs`: inline, one line. `md`: avatar plus name, optionally with position below. */
  size?: "xs" | "md";
  showPosition?: boolean;
  unknownLabel?: string;
}

/** Avatar + name (+ position), shown exactly as stored. */
export default function UserTag({
  person,
  size = "xs",
  showPosition = false,
  unknownLabel = "Unknown user",
}: UserTagProps) {
  const name = person ? person.name : unknownLabel;
  const position = person?.position || null;

  const nameClass = !person
    ? "text-theme-xs italic text-gray-500 dark:text-gray-400"
    : size === "md"
      ? "text-theme-sm font-medium text-gray-800 dark:text-white/90"
      : "text-theme-xs font-medium text-gray-700 dark:text-gray-300";

  return (
    <span
      className="inline-flex min-w-0 items-center gap-2 align-middle"
      title={position ? `${name} · ${position}` : name}
    >
      <UserAvatar name={person?.name ?? null} size={size} />
      <span className="min-w-0">
        <span className={`block truncate ${nameClass}`}>{name}</span>
        {showPosition && position && (
          <span className="block truncate text-theme-xs text-gray-500 dark:text-gray-400">
            {position}
          </span>
        )}
      </span>
    </span>
  );
}

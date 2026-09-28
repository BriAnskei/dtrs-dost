export default function Toggle({
  enabled,
  onChange,
  disabled = false,
  size = "md",
  variant = "default",
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  /** "danger" colors the ON state red — use for high-risk permissions like Delete. */
  variant?: "default" | "danger";
}) {
  const track = size === "sm" ? "w-8 h-4" : "w-10 h-5";
  const thumb = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";
  const enabledColor = variant === "danger" ? "bg-danger" : "bg-secondary";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50
        ${track}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${enabled ? enabledColor : "bg-gray-300 dark:bg-gray-600"}`}
    >
      <span
        className={`inline-block rounded-full bg-white shadow transition-transform duration-200
          ${thumb}
          ${enabled ? translate : "translate-x-0.5"}`}
      />
    </button>
  );
}

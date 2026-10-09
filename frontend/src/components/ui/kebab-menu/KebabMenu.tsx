import { MoreVertical } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

export interface KebabAction {
  /** Display label for the menu item. */
  label: string;
  /** Optional icon rendered before the label. */
  icon?: ReactNode;
  /** Called when the item is clicked (unless `disabled`). */
  handler: () => void;
  /** When true, renders the item in the danger (red) color style. */
  danger?: boolean;
  /** When true, the item is non-interactive and visually dimmed. */
  disabled?: boolean;

  /** Tooltip shown when the action is disabled, e.g. missing permission. */
  disabledReason?: string;
}

export interface KebabMenuProps {
  /** Array of actions to render inside the dropdown. */
  actions: KebabAction[];
  /** Tooltip / title for the trigger button. */
  title?: string;
  /** Optional custom trigger icon; defaults to the 3-dot icon. */
  icon?: ReactNode;
  /** Optional additional classes for the root element. */
  className?: string;
}

// ─── Global Kebab Menu ─────────────────────────────────────────────────

export default function KebabMenu({
  actions,
  title = "More actions",
  icon,
  className,
}: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block ${className || ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/[0.06] dark:hover:text-gray-200 transition-colors focus:outline-none"
        title={title}
      >
        {icon ?? <MoreVertical className="w-5 h-5" />}
      </button>

      {open && (
        <div className="absolute z-50 right-0 mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/[0.08] dark:bg-gray-900">
          {actions.map((action, idx) => (
            <button
              type="button"
              key={action.label}
              aria-disabled={action.disabled || undefined}
              title={action.disabled ? action.disabledReason : undefined}
              onClick={() => {
                if (action.disabled) return;
                action.handler();
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-theme-xs transition-colors
                ${idx === 0 ? "rounded-t-lg" : ""}
                ${idx === actions.length - 1 ? "rounded-b-lg" : ""}
                ${
                  action.disabled
                    ? "opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500"
                    : action.danger
                      ? "text-danger hover:bg-red-50 dark:hover:bg-red-500/10"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-5 dark:hover:bg-white/[0.05]"
                }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
}

export interface KebabMenuProps {
  /** Array of actions to render inside the dropdown. */
  actions: KebabAction[];
  /** Tooltip / title for the trigger button. */
  title?: string;
  /** Optional custom trigger icon; defaults to the 3-dot circle icon. */
  icon?: ReactNode;
  /** Optional additional classes for the root element. */
  className?: string;
}

// ─── Trigger icon (three vertical dots) ──────────────────────────────

export function DotsVerticalIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

// ─── Action icons ──────────────────────────────────────────────────────
// Shared icon set used across kebab menu actions. Each accepts an optional
// className so consumers can override sizing/colour when needed.

const iconCls = "h-4 w-4";

export function ViewIcon({ className = iconCls }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

export function EditIcon({ className = iconCls }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

export function EnableIcon({ className = iconCls }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function DisableIcon({ className = iconCls }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
      />
    </svg>
  );
}

export function KeyIcon({ className = iconCls }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
      />
    </svg>
  );
}

export function HistoryIcon({ className = iconCls }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

export function ShareIcon({ className = iconCls }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.684 13.342a4 4 0 105.316 5.658m6.632-8.974a4 4 0 10-5.316 5.658m0 2.316L8.684 13.342m6.632 4.974a4 4 0 105.316 5.658m0 2.316L8.684 15.658m9.316-9.632a4 4 0 11-8 0 4 4 0 018 0zm0 12a4 4 0 11-8 0 4 4 0 018 0zM7 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

export function ArchiveIcon({ className = iconCls }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 010 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  );
}

export function UpdateStatusIcon({ className = iconCls }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

export function TrashIcon({ className = iconCls }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.133A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.86L5 7M4 7h16M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7l1 14a2 2 0 002 2h10a2 2 0 002-2L20 7"
      />
    </svg>
  );
}

// ─── Global Kebab Menu ─────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
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
        {icon ?? <DotsVerticalIcon />}
      </button>

      {open && (
        <div className="absolute z-50 right-0 mt-1 w-40 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/[0.08] dark:bg-gray-900">
          {actions.map((action, idx) => (
            <button
              type="button"
              key={action.label}
              onClick={() => {
                if (!action.disabled) {
                  action.handler();
                  setOpen(false);
                }
              }}
              disabled={action.disabled}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-theme-xs transition-colors
                ${idx === 0 ? "rounded-t-lg" : ""}
                ${idx === actions.length - 1 ? "rounded-b-lg" : ""}
                ${
                  action.danger
                    ? "text-danger hover:bg-red-50 dark:hover:bg-red-500/10"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                }
                ${action.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
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

import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState } from "react";

interface Props {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** Collapsed-by-default section for non-critical details (progressive disclosure). */
export default function MyUploadedDocumentDisclosure({
  title,
  description,
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-white/8 dark:bg-white/3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {title}
          </span>
          {description && (
            <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
              {description}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="space-y-5 border-t border-gray-100 p-4 dark:border-white/5"
      >
        {children}
      </div>
    </div>
  );
}

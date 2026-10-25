import { X } from "lucide-react";
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { THIN_SCROLLBAR } from "../contant/ThinScrollBar";

/* -------------------------------------------------------------------------- */
/*  DetailPanel — reusable Master-Detail slide-over                           */
/*                                                                            */
/*  Same slot API as <Modal>: callers pass `title` / `body` / `footer` and    */
/*  never touch the portal, backdrop, focus handling or animation.            */
/*                                                                            */
/*  Also exports small layout helpers so every module's detail view looks     */
/*  the same:  <DetailSection>, <DetailFieldGrid>, <DetailField>.             */
/* -------------------------------------------------------------------------- */

const EXIT_MS = 200;

type PanelSize = "md" | "lg" | "xl";

/** Full-width on mobile; capped width from `sm` up. */
const PANEL_SIZE: Record<PanelSize, string> = {
  md: "sm:max-w-md",
  lg: "sm:max-w-xl",
  xl: "sm:max-w-3xl",
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface DetailPanelProps {
  /** Controlled open state. The panel stays mounted during the exit animation. */
  isOpen: boolean;
  onClose: () => void;
  /** Main heading (e.g. the tracking number). Also labels the dialog for screen readers. */
  title: ReactNode;
  /** Small uppercase label above the title (e.g. "Document details"). */
  eyebrow?: ReactNode;
  /** Panel width from `sm` up: `md` / `lg` / `xl`. Default `lg`. */
  size?: PanelSize;
  /** Scrollable body content. */
  body: ReactNode;
  /** Sticky footer content (action buttons). Omit for no footer. */
  footer?: ReactNode;
  /** Click the backdrop to close. Default `true`. */
  backdropCloses?: boolean;
  /** Block every close path (backdrop, Esc, X) while busy. Default `false`. */
  closeDisabled?: boolean;
}

export default function DetailPanel({
  isOpen,
  onClose,
  title,
  eyebrow,
  size = "lg",
  body,
  footer,
  backdropCloses = true,
  closeDisabled = false,
}: DetailPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);

  // `mounted` keeps the DOM alive for the exit animation; `visible` drives the transition.
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      // Two frames so the closed (translate-x-full) state paints before we transition.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  // Scroll lock + focus management: focus the panel on open, restore focus on close.
  useEffect(() => {
    if (!mounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [mounted]);

  // Esc to close.
  useEffect(() => {
    if (!isOpen || closeDisabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeDisabled, onClose]);

  // Keep Tab / Shift+Tab inside the panel while it is open.
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key !== "Tab") return;
    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes || nodes.length === 0) {
      e.preventDefault();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-99999">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close details"
        onClick={backdropCloses && !closeDisabled ? onClose : undefined}
        className={`absolute inset-0 cursor-default bg-black/40 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`absolute inset-y-0 right-0 flex w-full ${PANEL_SIZE[size]} flex-col border-l border-gray-200 bg-white shadow-2xl outline-none transition-transform duration-200 ease-out motion-reduce:transition-none dark:border-white/8 dark:bg-gray-900 ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-white/8 sm:px-6">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-theme-xs font-semibold uppercase tracking-wider text-primary dark:text-secondary">
                {eyebrow}
              </p>
            )}
            <h2
              id={titleId}
              className="mt-0.5 truncate text-lg font-semibold text-gray-800 dark:text-white/90"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close details"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/8 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className={`flex-1 overflow-y-auto px-5 py-5 sm:px-6 ${THIN_SCROLLBAR}`}>
          {body}
        </div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-white/8 sm:px-6">
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}

/* ---------------------------- Layout helpers ------------------------------ */

/** A titled block inside the body (e.g. "Document file"). */
export function DetailSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The tinted "key facts" card. One column on phones, two from `sm`. */
export function DetailFieldGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl bg-gray-50 p-4 dark:bg-white/3 sm:grid-cols-2">
      {children}
    </dl>
  );
}

/** One label/value pair. `full` spans both columns (long values like a sender name). */
export function DetailField({
  label,
  children,
  full = false,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`min-w-0 ${full ? "sm:col-span-2" : ""}`}>
      <dt className="text-theme-xs text-gray-400 dark:text-gray-500">{label}</dt>
      <dd className="mt-0.5 wrap-break-word text-theme-sm font-medium text-gray-800 dark:text-white/90">
        {children}
      </dd>
    </div>
  );
}

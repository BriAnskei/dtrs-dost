import {
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export interface PopoverTriggerState {
  open: boolean;
  toggle: () => void;
  /** Spread onto your trigger <button> for correct ARIA wiring. */
  triggerProps: {
    "aria-haspopup": "dialog";
    "aria-expanded": boolean;
    "aria-controls": string;
  };
}

export interface PopoverProps {
  /** Render your own trigger button; spread `triggerProps` onto it. */
  renderTrigger: (state: PopoverTriggerState) => ReactNode;
  /** Panel content. Pass a function to get `close()` (e.g. close after picking an item). */
  children: ReactNode | ((api: { close: () => void }) => ReactNode);
  /** Which edge of the trigger the panel lines up with. */
  align?: "left" | "right";
  /** Width classes for the panel. */
  panelClassName?: string;
  className?: string;
}

/**
 * Minimal anchored popover: closes on outside press or Escape (and returns
 * focus to the trigger). Escape is stopped from bubbling so it won't also
 * trigger page-level Escape handlers such as "leave selection mode".
 */
export default function Popover({
  renderTrigger,
  children,
  align = "left",
  panelClassName = "w-64",
  className = "",
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function handleKeyDown(e: ReactKeyboardEvent) {
    if (e.key !== "Escape" || !open) return;
    e.stopPropagation();
    setOpen(false);
    rootRef.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
  }

  const close = () => setOpen(false);

  return (
    <div
      ref={rootRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-block ${className}`}
    >
      {renderTrigger({
        open,
        toggle: () => setOpen((v) => !v),
        triggerProps: {
          "aria-haspopup": "dialog",
          "aria-expanded": open,
          "aria-controls": panelId,
        },
      })}

      {open && (
        <div
          id={panelId}
          role="dialog"
          className={`absolute z-50 mt-2 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-white/[0.08] dark:bg-gray-900 ${
            align === "right" ? "right-0" : "left-0"
          } ${panelClassName}`}
        >
          {typeof children === "function" ? children({ close }) : children}
        </div>
      )}
    </div>
  );
}

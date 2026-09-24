import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { THIN_SCROLLBAR } from "../contant/ThinScrollBar";

interface ModalProps {
  /** Controlled open state. Defaults to `true` (parents mount/unmount directly). */
  isOpen?: boolean;
  onClose: () => void;
  /** Render the click-to-close backdrop. Default `true`. */
  backdrop?: boolean;
  /** Click the backdrop to close. Default `true`; `false` for display-only modals. */
  backdropCloses?: boolean;
  /** Card width: `sm` / `md` / `lg`. Default `md`. */
  size?: "sm" | "md" | "lg";
  /** Card height-constrained + scrollable body. Default `true`. */
  scrollable?: boolean;
  /** Header content (title / subtitle / close button). */
  header?: ReactNode;
  /** Body content. */
  body: ReactNode;
  /** Footer content (action buttons). */
  footer?: ReactNode;
  /** Block all close paths while busy (prevents backdrop + ESC close). Default `false`. */
  closeDisabled?: boolean;
}

const CARD_SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

const bodyWrapper = (scrollable: boolean) =>
  `px-5 py-5 ${scrollable ? "flex-1 overflow-y-auto" : ""} ${THIN_SCROLLBAR}`;

/**
 * Reusable modal shell shared by the user-management modals (Add, Edit,
 * Deactivate, ResetPassword, UserCredentials). Hoists the structure every
 * modal duplicated: `createPortal` to `document.body`, the click-guarded
 * backdrop, the `rounded-2xl` card, the anti-autofill honeypot `<form>`, and the
 * scrollable body wrapper (with `THIN_SCROLLBAR` baked in so callers don't
 * repeat it). Callers only pass `header` / `body` / `footer` slots.
 */
export default function Modal({
  isOpen = true,
  onClose,
  backdrop = true,
  backdropCloses = true,
  size = "md",
  scrollable = true,
  header,
  body,
  footer,
  closeDisabled = false,
}: ModalProps) {
  if (!isOpen) return null;

  const handleClose = closeDisabled ? undefined : onClose;

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      {backdrop && (
        <button
          type="button"
          aria-label="Close modal"
          className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
          onClick={backdropCloses ? handleClose : undefined}
        />
      )}

      <div
        className={`relative w-full ${CARD_SIZE[size]} rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/8 dark:bg-gray-900 flex flex-col ${
          scrollable ? "max-h-[90vh]" : ""
        }`}
      >
        <form
          autoComplete="off"
          onSubmit={(e) => e.preventDefault()}
          className="contents"
        >
          <input type="hidden" autoComplete="username" name="username" tabIndex={-1} />
          <input type="hidden" autoComplete="new-password" name="password" tabIndex={-1} />

          {header && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/8">
              {header}
            </div>
          )}

          <div className={bodyWrapper(scrollable)}>{body}</div>

          {footer && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/8">
              {footer}
            </div>
          )}
        </form>
      </div>
    </div>,
    document.body,
  );
}

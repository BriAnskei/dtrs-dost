import { createPortal } from "react-dom";
import { useResetPasswordModal } from "../hooks/use-reset-password-modal";
import type { SystemUser } from "../type/user.type";
import ChooseMethodStep from "./resetSteps/ChooseMethodStep";
import DirectResetStep from "./resetSteps/DirectResetStep";
import LinkResetStep from "./resetSteps/LinkResetStep";
import VerifyPasswordStep from "./resetSteps/VerifyPasswordStep";

export default function ResetPasswordModal({
  user,
  onClose,
}: {
  user: SystemUser;
  onClose: () => void;
}) {
  const modal = useResetPasswordModal(user, onClose);
  const { step, goBack, handleClose, method, resetComplete } = modal;

  const activeIndex = step === "verify" ? 0 : step === "method" ? 1 : 2;
  const finalLabel = method === "link" ? "Share link" : "New password";
  const stepLabels = ["Verify", "Method", finalLabel];

  // Hide the generic back-only footer once a terminal state has its own
  // primary action (the direct-reset success screen shows "Done" itself).
  const hideFooter = step === "verify" || (step === "direct" && resetComplete);

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/8 dark:bg-gray-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/8">
          <div>
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              Reset Password
            </h2>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {user.name}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 pt-4">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium shrink-0 transition-colors ${
                    i < activeIndex
                      ? "bg-primary text-white"
                      : i === activeIndex
                        ? "bg-primary/10 text-primary border border-primary"
                        : "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500"
                  }`}
                >
                  {i < activeIndex ? "✓" : i + 1}
                </span>
                <span
                  className={`text-theme-xs whitespace-nowrap ${
                    i <= activeIndex
                      ? "text-gray-700 dark:text-gray-300"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className="h-px flex-1 mx-2 bg-gray-100 dark:bg-white/8" />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === "verify" && <VerifyPasswordStep modal={modal} />}
          {step === "method" && <ChooseMethodStep modal={modal} />}
          {step === "direct" && <DirectResetStep modal={modal} />}
          {step === "link" && <LinkResetStep modal={modal} />}
        </div>

        {/* Footer */}
        {!hideFooter && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/8">
            <button
              type="button"
              onClick={goBack}
              className="text-theme-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

import Modal from "../../../../../components/Modal";
import { useResetPasswordModal } from "../../../hooks/reset-password/use-reset-password-modal";
import type { SystemUser } from "../../../types/user.type";
import ChooseMethodStep from "./ChooseMethodStep";
import DirectResetStep from "./DirectResetStep";
import LinkResetStep from "./LinkResetStep";
import TokenConflictStep from "./TokenConflictStep";
import VerifyPasswordStep from "./VerifyPasswordStep";

export default function ResetPasswordModal({
  user,
  onClose,
}: {
  user: SystemUser;
  onClose: () => void;
}) {
  const modal = useResetPasswordModal(user, onClose);
  const { step, goBack, handleClose, method, resetComplete } = modal;

  const activeIndex =
    step === "verify" ? 0 : step === "method" || step === "conflict" ? 1 : 2;
  const finalLabel = method === "link" ? "Share link" : "New password";
  const stepLabels = ["Verify", "Method", finalLabel];

  const hideFooter =
    step === "verify" || step === "conflict" || (step === "direct" && resetComplete);

  const renderStep = () => {
    if (step === "verify") return <VerifyPasswordStep modal={modal} />;
    if (step === "method") return <ChooseMethodStep modal={modal} />;
    if (step === "conflict") return <TokenConflictStep modal={modal} />;
    if (step === "direct") return <DirectResetStep modal={modal} />;
    if (step === "link") return <LinkResetStep modal={modal} />;
    return null;
  };

  return (
    <Modal
      onClose={handleClose}
      size="md"
      scrollable
      header={
        <div className="w-full">
          <div className="flex items-center justify-between">
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

          <div className="flex items-center pt-4">
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
        </div>
      }
      body={<div className="pt-2">{renderStep()}</div>}
      footer={
        !hideFooter && (
          <button
            type="button"
            onClick={goBack}
            disabled={modal.isAbandoningLink}
            className="text-theme-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {modal.isAbandoningLink ? "Discarding link…" : "← Back"}
          </button>
        )
      }
    />
  );
}

import { useState } from "react";
import Input from "../../../../components/form/input/InputField";
import { useVerifyPasswordStep } from "../../hooks/reset-password/use-verify-password";
import { useDeactivateUser } from "../../hooks/use-deactivate-user";
import type { SystemUser } from "../../types/user.type";
import Modal from "../../../../components/Modal";

export default function DeactivateUserModal({
  user,
  onClose,
}: {
  user: SystemUser;
  onClose: () => void;
}) {
  const [verified, setVerified] = useState(false);

  const {
    adminPassword,
    setAdminPassword,
    adminPasswordError,
    setAdminPasswordError,
    isVerifying,
    handleVerifyPassword,
  } = useVerifyPasswordStep(() => setVerified(true));

  const { mutate, isPending } = useDeactivateUser();

  const busy = isVerifying || isPending;

  const handleConfirm = () => {
    mutate(user.id, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Modal
      onClose={onClose}
      size="sm"
      scrollable={false}
      closeDisabled={busy}
      backdropCloses={!busy}
      header={
        <>
          <div>
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {verified ? "Deactivate User" : "Verify Your Identity"}
            </h2>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {verified
                ? "This action can be reversed later."
                : "Confirm your password to continue."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
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
        </>
      }
      body={
        <div>
          {!verified ? (
            <div className="flex flex-col gap-1">
              <p className="text-theme-xs text-gray-500 dark:text-gray-400 mb-3">
                Deactivating another user is a sensitive action. Confirm your own
                password to continue.
              </p>

              <Input
                type="password"
                size="sm"
                label="Your Password"
                labelRequired
                id="deactivate-admin-password"
                name="deactivate-admin-password-no-autofill"
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  setAdminPasswordError(undefined);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
                autoComplete="off"
                data-form-type="other"
                placeholder="Enter your password"
                error={adminPasswordError}
              />
            </div>
          ) : (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              Are you sure you want to deactivate{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {user.name}
              </span>
              ? They will lose access until reactivated.
            </p>
          )}
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border-white/8 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          {!verified ? (
            <button
              type="button"
              onClick={handleVerifyPassword}
              disabled={isVerifying}
              className="px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
            >
              {isVerifying ? "Verifying…" : "Continue"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="px-4 py-2 text-theme-sm font-medium text-white bg-danger hover:bg-danger/90 rounded-lg transition-colors disabled:opacity-50"
            >
              {isPending ? "Deactivating…" : "Deactivate"}
            </button>
          )}
        </>
      }
    />
  );
}

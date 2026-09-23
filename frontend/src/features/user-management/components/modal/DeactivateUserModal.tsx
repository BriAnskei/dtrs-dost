import { useState } from "react";
import { createPortal } from "react-dom";
import { useVerifyPasswordStep } from "../../hooks/reset-password/use-verify-password";
import { useDeactivateUser } from "../../hooks/use-deactivate-user";
import type { SystemUser } from "../../types/user.type";

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
    showAdminPassword,
    setShowAdminPassword,
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

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        onClick={!busy ? onClose : undefined}
      />

      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/8 dark:bg-gray-900 flex flex-col">
        <form
          autoComplete="off"
          onSubmit={(e) => e.preventDefault()}
          className="contents"
        >
          <input type="hidden" autoComplete="username" name="username" tabIndex={-1} />
          <input
            type="hidden"
            autoComplete="new-password"
            name="password"
            tabIndex={-1}
          />

          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/8">
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
          </div>

          <div className="px-6 py-5">
            {!verified ? (
              <div className="flex flex-col gap-1">
                <p className="text-theme-xs text-gray-500 dark:text-gray-400 mb-3">
                  Deactivating another user is a sensitive action. Confirm your own
                  password to continue.
                </p>

                <label
                  htmlFor="deactivate-admin-password"
                  className="text-theme-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  Your Password <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <input
                    id="deactivate-admin-password"
                    name="deactivate-admin-password-no-autofill"
                    type={showAdminPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAdminPasswordError(undefined);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
                    autoComplete="off"
                    data-form-type="other"
                    placeholder="Enter your password"
                    className={`w-full px-3 py-2 pr-10 text-theme-sm rounded-lg border bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 transition dark:bg-white/3 dark:text-gray-200 dark:placeholder-gray-500 ${
                      adminPasswordError
                        ? "border-danger focus:ring-danger/30"
                        : "border-gray-200 focus:ring-secondary/40 focus:border-secondary dark:border-white/8"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword((s) => !s)}
                    aria-label={showAdminPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-1 flex items-center p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      {showAdminPassword ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      ) : (
                        <>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
                {adminPasswordError && (
                  <span className="text-theme-xs text-danger">{adminPasswordError}</span>
                )}
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

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/8">
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
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

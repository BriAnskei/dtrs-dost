import type { useResetPasswordModal } from "../../hooks/use-reset-password-modal";

type Props = { modal: ReturnType<typeof useResetPasswordModal> };

export default function VerifyPasswordStep({ modal }: Props) {
  const {
    adminPassword,
    setAdminPassword,
    adminPasswordError,
    setAdminPasswordError,
    showAdminPassword,
    setShowAdminPassword,
    isVerifying,
    handleVerifyPassword,
  } = modal;

  return (
    <div className="space-y-4">
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        Resetting another user&apos;s password is a sensitive action. Confirm your own
        password to continue.
      </p>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="admin-password"
          className="text-theme-xs font-medium text-gray-600 dark:text-gray-400"
        >
          Your Password <span className="text-danger">*</span>
        </label>
        <div className="relative">
          <input
            id="admin-password"
            type={showAdminPassword ? "text" : "password"}
            value={adminPassword}
            onChange={(e) => {
              setAdminPassword(e.target.value);
              setAdminPasswordError(undefined);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
            autoComplete="current-password"
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

      <button
        type="button"
        onClick={handleVerifyPassword}
        disabled={isVerifying}
        className="w-full px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
      >
        {isVerifying ? "Verifying…" : "Continue"}
      </button>
    </div>
  );
}

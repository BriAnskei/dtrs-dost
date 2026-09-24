import { Link } from "react-router";
import Input from "../../../components/form/input/InputField";
import { useResetPasswordFlow } from "../hooks/use-authReset-password";

export default function ResetPasswordForm({ token }: { token: string | undefined }) {
  const {
    isVerifying,
    isTokenInvalid,
    tokenErrorMessage,
    isExpired,
    remaining,
    isUrgent,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    formErrors,
    setFormErrors,
    isSubmitting,
    resetComplete,
    handleSubmit,
  } = useResetPasswordFlow(token);

  if (!token) {
    return (
      <InvalidLinkState message="This reset link is missing its token. Please ask your administrator for a new one." />
    );
  }

  if (isVerifying) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary dark:border-white/10" />
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">
          Verifying your reset link…
        </p>
      </div>
    );
  }

  if (isTokenInvalid || isExpired) {
    return (
      <InvalidLinkState
        message={
          tokenErrorMessage ??
          "This reset link has expired. Please ask your administrator to generate a new one."
        }
      />
    );
  }

  if (resetComplete) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
            Password changed
          </h1>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            You can now sign in with your new password.
          </p>
        </div>
        <Link
          to="/signin"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-secondary"
        >
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="text-text mb-2 text-title-sm font-semibold sm:text-title-md dark:text-white/90">
              Set a new password
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose a new password for your account.
            </p>
          </div>

          {remaining && (
            <div
              className={`mb-5 flex items-center justify-between rounded-lg border px-3 py-2 text-theme-xs transition-colors ${
                isUrgent
                  ? "border-danger/30 bg-danger/5 text-danger"
                  : "border-gray-200 bg-gray-5 text-gray-500 dark:border-white/8 dark:bg-white/[0.03] dark:text-gray-400"
              }`}
            >
              <span>{isUrgent ? "Link expiring soon" : "This link will expire"}</span>
              <span className="font-medium">{remaining}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            noValidate
          >
            <div className="space-y-6">
              <Input
                type="password"
                size="md"
                label="New Password"
                labelRequired
                name="new-password"
                autoComplete="new-password"
                placeholder="Enter your new password"
                error={formErrors.password}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormErrors((er) => ({ ...er, password: undefined }));
                }}
              />

              <Input
                type="password"
                size="md"
                label="Confirm Password"
                labelRequired
                name="confirm-password"
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                error={formErrors.confirmPassword}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setFormErrors((er) => ({ ...er, confirmPassword: undefined }));
                }}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Resetting…" : "Reset Password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function InvalidLinkState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger dark:bg-red-500/10">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <div className="max-w-xs">
        <h1 className="text-title-sm font-semibold text-gray-800 dark:text-white/90">
          Link unavailable
        </h1>
        <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">{message}</p>
      </div>
      <Link to="/signin" className="text-sm font-medium text-secondary hover:underline">
        Back to Sign In
      </Link>
    </div>
  );
}

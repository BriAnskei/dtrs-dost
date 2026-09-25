import Input from "../../../../../components/form/input/InputField";
import type { useResetPasswordModal } from "../../../hooks/reset-password/use-reset-password-modal";

type Props = { modal: ReturnType<typeof useResetPasswordModal> };

export default function DirectResetStep({ modal }: Props) {
  const {
    user,
    directForm,
    setDirectForm,
    directErrors,
    setDirectErrors,
    isResetting,
    resetComplete,
    directPasswordRef,
    handleGeneratePassword,
    handleDirectSubmit,
    handleClose,
  } = modal;

  if (resetComplete) {
    return (
      <div className="flex flex-col items-center text-center gap-3 py-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
          <svg
            className="w-5 h-5"
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
          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
            Password reset
          </p>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {user.name}&apos;s password has been updated. Share the new password with them
            securely.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="mt-2 px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Input
        type="password"
        noBrowserPassword
        size="sm"
        label="New Password"
        labelRequired
        labelAction={
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="text-theme-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
          >
            Generate password
          </button>
        }
        id="direct-new-password"
        name="direct-new-password"
        ref={directPasswordRef}
        autoComplete="new-password"
        placeholder="Temporary password"
        error={directErrors.password}
        value={directForm.password}
        onChange={(e) => {
          setDirectForm((f) => ({ ...f, password: e.target.value }));
          setDirectErrors((er) => ({ ...er, password: undefined }));
        }}
      />

      <Input
        type="password"
        noBrowserPassword
        size="sm"
        label="Confirm Password"
        labelRequired
        id="direct-confirm-password"
        name="direct-confirm-password"
        autoComplete="new-password"
        placeholder="Re-enter the password"
        error={directErrors.confirmPassword}
        value={directForm.confirmPassword}
        onChange={(e) => {
          setDirectForm((f) => ({ ...f, confirmPassword: e.target.value }));
          setDirectErrors((er) => ({ ...er, confirmPassword: undefined }));
        }}
      />

      <button
        type="button"
        onClick={handleDirectSubmit}
        disabled={isResetting}
        className="w-full px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
      >
        {isResetting ? "Resetting…" : "Reset Password"}
      </button>
    </div>
  );
}

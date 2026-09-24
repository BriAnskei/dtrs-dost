import Input from "../../../../../components/form/input/InputField";
import type { useResetPasswordModal } from "../../../hooks/reset-password/use-reset-password-modal";

type Props = { modal: ReturnType<typeof useResetPasswordModal> };

export default function VerifyPasswordStep({ modal }: Props) {
  const {
    adminPassword,
    setAdminPassword,
    adminPasswordError,
    setAdminPasswordError,
    isVerifying,
    handleVerifyPassword,
  } = modal;

  return (
    <div className="space-y-4">
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        Resetting another user&apos;s password is a sensitive action. Confirm your own
        password to continue.
      </p>

      <Input
        type="password"
        size="sm"
        label="Your Password"
        labelRequired
        id="admin-password"
        name="admin-password"
        autoComplete="current-password"
        placeholder="Enter your password"
        error={adminPasswordError}
        value={adminPassword}
        onChange={(e) => {
          setAdminPassword(e.target.value);
          setAdminPasswordError(undefined);
        }}
        onKeyDown={(e) => e.key === "Enter" && handleVerifyPassword()}
      />

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

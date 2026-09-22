import type { useResetPasswordModal } from "../../../hooks/reset-password/use-reset-password-modal";

type Props = { modal: ReturnType<typeof useResetPasswordModal> };

export default function ChooseMethodStep({ modal }: Props) {
  const { selectMethod } = modal;

  return (
    <div className="space-y-3">
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        How should this user&apos;s password be reset?
      </p>

      <button
        type="button"
        onClick={() => selectMethod("direct")}
        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-secondary hover:bg-secondary/5 dark:border-white/8 dark:hover:bg-white/[0.03] transition-colors"
      >
        <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
          Set a password directly
        </span>
        <span className="block text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Choose a temporary password now and share it with the user yourself.
        </span>
      </button>

      <button
        type="button"
        onClick={() => selectMethod("link")}
        className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-secondary hover:bg-secondary/5 dark:border-white/8 dark:hover:bg-white/[0.03] transition-colors"
      >
        <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
          Generate a reset link (QR code)
        </span>
        <span className="block text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
          The user scans the code on their own device and sets a new password themselves.
        </span>
      </button>
    </div>
  );
}

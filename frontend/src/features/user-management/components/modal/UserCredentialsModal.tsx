import { useState } from "react";
import { toast } from "sonner";
import Modal from "../../../../components/Modal";
import {
  CheckCircleIcon,
  CheckLineIcon,
  CopyIcon,
  EyeCloseIcon,
  EyeIcon,
  InfoIcon,
} from "../../../../icons";

function CredentialRow({
  label,
  value,
  masked = false,
}: {
  label: string;
  value: string;
  masked?: boolean;
}) {
  const [revealed, setRevealed] = useState(!masked);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied to clipboard.`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(`Couldn't copy ${label.toLowerCase()}.`);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-theme-xs font-medium text-gray-600 dark:text-gray-400">
        {label}
      </span>
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 pl-3 pr-1 py-1 dark:border-white/8 dark:bg-white/3">
        <span className="flex-1 truncate font-mono text-theme-sm text-gray-700 dark:text-gray-200 select-all">
          {masked && !revealed ? "•".repeat(Math.min(value.length, 14)) : value}
        </span>

        {masked && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={
              revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`
            }
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
          >
            {revealed ? (
              <EyeCloseIcon className="size-4 fill-current" />
            ) : (
              <EyeIcon className="size-4 fill-current" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
        >
          {copied ? (
            <CheckLineIcon className="size-4" />
          ) : (
            <CopyIcon className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export default function UserCredentialsModal({
  email,
  password,
  onClose,
}: {
  email: string;
  password: string;
  onClose: () => void;
}) {
  async function handleCopyBoth() {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
      toast.success("Credentials copied to clipboard.");
    } catch {
      toast.error("Couldn't copy credentials.");
    }
  }

  return (
    <Modal
      onClose={onClose}
      size="md"
      scrollable={false}
      backdropCloses={false}
      header={
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircleIcon className="size-4" />
          </span>
          <div>
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              User created
            </h2>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Share these credentials with the new user.
            </p>
          </div>
        </div>
      }
      body={
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
            <span className="mt-0.5 shrink-0 text-warning">
              <InfoIcon className="size-4" />
            </span>
            <p className="text-theme-xs text-gray-600 dark:text-gray-300">
              Save this password now — for security it won't be shown again after you
              close this window.
            </p>
          </div>

          <CredentialRow label="Email" value={email} />
          <CredentialRow label="Password" value={password} masked />
        </div>
      }
      footer={
        <>
          <button
            type="button"
            onClick={handleCopyBoth}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border-white/8 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Copy both
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            Done
          </button>
        </>
      }
    />
  );
}

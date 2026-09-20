import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import type { useResetPasswordModal } from "../../hooks/use-reset-password-modal";

// Requires the `qrcode.react` package:
//   npm install qrcode.react

type Props = { modal: ReturnType<typeof useResetPasswordModal> };

export default function LinkResetStep({ modal }: Props) {
  const {
    user,
    resetLinkUrl,
    linkExpiresAt,
    isGeneratingLink,
    generateLink,
    handleCopyLink,
    handleClose,
  } = modal;

  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!linkExpiresAt) return;

    const tick = () => {
      const ms = linkExpiresAt.getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("Expired");
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, "0")}`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [linkExpiresAt]);

  const isExpired = remaining === "Expired";

  if (isGeneratingLink || !resetLinkUrl) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-primary animate-spin dark:border-white/10" />
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          Generating reset link…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-theme-xs text-gray-500 dark:text-gray-400 text-center">
        Ask {user.name} to scan this code, or send them the link below. They&apos;ll set
        their own new password.
      </p>

      <div className="p-3 rounded-xl border border-gray-200 bg-white dark:border-white/8">
        <QRCodeSVG value={resetLinkUrl} size={160} />
      </div>

      <div
        className={`text-theme-xs font-medium ${
          isExpired ? "text-danger" : "text-gray-400 dark:text-gray-500"
        }`}
      >
        {isExpired ? "This link has expired." : `Expires in ${remaining}`}
      </div>

      <div className="w-full flex items-center gap-2">
        <input
          readOnly
          value={resetLinkUrl}
          className="flex-1 px-3 py-2 text-theme-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-500 truncate dark:border-white/8 dark:bg-white/[0.03] dark:text-gray-400"
        />
        <button
          type="button"
          onClick={handleCopyLink}
          className="px-3 py-2 text-theme-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:border-secondary hover:text-secondary transition-colors dark:border-white/8 dark:text-gray-300"
        >
          Copy
        </button>
      </div>

      {isExpired && (
        <button
          type="button"
          onClick={generateLink}
          className="text-theme-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
        >
          Generate a new link
        </button>
      )}

      <button
        type="button"
        onClick={handleClose}
        className="w-full px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
      >
        Done
      </button>
    </div>
  );
}

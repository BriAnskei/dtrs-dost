// components/admin/NeedsAttentionStrip.tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { useUser } from "../../context/currentUser/use-user";
import { AlertIcon, ArrowRightIcon } from "../../icons";

interface AttentionItem {
  label: string;
  value: number;
  to: string;
  // "alert": something is going wrong and needs a response (stale, invalid).
  // "indicator": a quiet status count, no action required yet (pending).
  // Distinction follows NN/g's notification taxonomy — treating both the
  // same way trains users to tune out the strip entirely (alert fatigue).
  tier: "alert" | "indicator";
}

const adminItems: AttentionItem[] = [
  { label: "Stale Documents", value: 2, to: "/admin/stale-documents", tier: "alert" },
  { label: "Invalid Documents", value: 6, to: "/upload-invalid", tier: "alert" },
  { label: "Pending Documents", value: 120, to: "/upload-queue", tier: "indicator" },
];

const receiverItems: AttentionItem[] = [
  { label: "Invalid Documents", value: 3, to: "/rejected-documents", tier: "alert" },
];

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function AlertDangerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
      />
    </svg>
  );
}

export default function NeedsAttentionStrip() {
  const { currentUser } = useUser();
  const role = currentUser?.role_id;
  const items = role === 3 ? receiverItems : adminItems;
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const visibleItems = items.filter((i) => i.value > 0);
  if (visibleItems.length === 0 || dismissed) return null;

  const alerts = visibleItems.filter((i) => i.tier === "alert");
  const indicators = visibleItems.filter((i) => i.tier === "indicator");
  const hasAlerts = alerts.length > 0;

  // Strip-level framing only escalates when a real alert is present.
  // A pending-only queue gets a quiet neutral strip, not a warning-colored one.
  const stripBg = hasAlerts ? "bg-danger/[0.04]" : "bg-gray-50";
  const stripBorder = hasAlerts ? "border-danger/20" : "border-gray-200";
  const stripBgDark = hasAlerts ? "dark:bg-danger/[0.04]" : "dark:bg-white/[0.02]";
  const stripBorderDark = hasAlerts
    ? "dark:border-danger/20"
    : "dark:border-white/[0.05]";
  const iconBg = hasAlerts ? "bg-danger/10" : "bg-gray-200/60 dark:bg-white/[0.06]";
  const IconComponent = hasAlerts ? AlertDangerIcon : AlertIcon;

  return (
    <div
      className={`flex items-center gap-3 overflow-x-auto rounded-xl border ${stripBorder} ${stripBg} px-3 py-2.5 ${stripBgDark} ${stripBorderDark}`}
    >
      <span
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        <IconComponent className="size-4" />
      </span>

      <div className="flex flex-1 items-center gap-2 overflow-x-auto">
        {/* Alerts: solid pill, bold count, danger-toned — demands a look. */}
        {alerts.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.to)}
            className="group flex flex-shrink-0 items-center gap-2 rounded-lg border border-danger/20 bg-white px-3 py-1.5 transition hover:border-danger/40 dark:border-danger/20 dark:bg-white/[0.03]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-danger" />
            <span className="text-theme-sm font-bold text-danger">{item.value}</span>
            <span className="text-theme-xs text-gray-500 dark:text-gray-400">
              {item.label}
            </span>
            <ArrowRightIcon className="size-3 text-gray-300 opacity-0 transition group-hover:opacity-100" />
          </button>
        ))}

        {/* Indicators: quieter outline chip, no dot, muted count — visible but not urgent. */}
        {indicators.map((item) => (
          <button
            key={item.label}
            onClick={() => navigate(item.to)}
            className="group flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-gray-500 transition hover:border-gray-300 hover:text-gray-700 dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="text-theme-sm font-semibold">{item.value}</span>
            <span className="text-theme-xs">{item.label}</span>
            <ArrowRightIcon className="size-3 opacity-0 transition group-hover:opacity-100" />
          </button>
        ))}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
        aria-label="Dismiss alert"
      >
        <CloseIcon className="size-4" />
      </button>
    </div>
  );
}

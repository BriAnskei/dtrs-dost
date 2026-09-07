import type { StatusType } from "../ui/modal/document/StatusUpdateModal";

// ── Icons ────────────────────────────────────────────────────────────

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
      />
    </svg>
  );
}

// ── Types ──────────────────────────────────────────────────────────────

type StatusFilter = StatusType | "All";

interface IncomingStatusMetricsProps {
  total: number;
  completed: number;
  onGoing: number;
  pending: number;
  activeStatus: StatusFilter;
  onSelect: (status: StatusFilter) => void;
}

interface MetricDef {
  key: StatusFilter;
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  ringClass: string;
}

// ── Component ─────────────────────────────────────────────────────────

export default function IncomingStatusMetrics({
  total,
  completed,
  onGoing,
  pending,
  activeStatus,
  onSelect,
}: IncomingStatusMetricsProps) {
  const metrics: MetricDef[] = [
    {
      key: "All",
      label: "Total Assigned",
      value: total,
      icon: <DocumentIcon className="text-[#3b82f6] size-6" />,
      iconBg: "bg-[#e0e7ff]",
      ringClass: "ring-primary",
    },
    {
      key: "Completed",
      label: "Completed",
      value: completed,
      icon: <CheckCircleIcon className="text-[#10b981] size-6" />,
      iconBg: "bg-[#d1fae5]",
      ringClass: "ring-success",
    },
    {
      key: "On-Going",
      label: "On-Going",
      value: onGoing,
      icon: <ClockIcon className="text-[#0284c7] size-6" />,
      iconBg: "bg-[#e0f2fe]",
      ringClass: "ring-primary",
    },
    {
      key: "Pending",
      label: "Pending",
      value: pending,
      icon: <AlertIcon className="text-[#ef4444] size-6" />,
      iconBg: "bg-[#fee2e2]",
      ringClass: "ring-danger",
    },
  ];

  function handleClick(key: StatusFilter) {
    onSelect(activeStatus === key ? "All" : key);
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6 xl:grid-cols-4">
      {metrics.map((m) => {
        const isActive = activeStatus === m.key;
        return (
          <button
            key={m.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => handleClick(m.key)}
            className={`rounded-2xl border border-[#fee8d6] bg-[#fffaf5] p-5 text-left transition-all md:p-6 dark:border-gray-800 dark:bg-white/[0.03] ${
              isActive
                ? "bg-gray-50 shadow-sm dark:bg-white/[0.06]"
                : "hover:border-gray-300 dark:hover:border-gray-700"
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${m.iconBg}`}
              >
                {m.icon}
              </div>
              <div className="flex-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {m.label}
                </span>
                <h4 className="text-title-sm mt-2 font-bold text-gray-800 dark:text-white/90">
                  {m.value.toLocaleString()}
                </h4>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

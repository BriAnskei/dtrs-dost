// components/admin/AdminMetrics.tsx

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  valueClass?: string;
}

function MetricCard({ label, value, icon, iconBg, valueClass }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-[#fee8d6] bg-[#fffaf5] p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-5">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-xl ${iconBg}`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <span className="text-xs text-[#4b5563] dark:text-gray-400">{label}</span>
          <h4
            className={`mt-0.5 font-bold text-[#1f2937] text-title-sm dark:text-white/90 ${valueClass ?? ""}`}
          >
            {value.toLocaleString()}
          </h4>
        </div>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────

function FolderIcon({ className }: { className?: string }) {
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
        d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
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

function RefreshIcon({ className }: { className?: string }) {
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
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
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

// ── Component ─────────────────────────────────────────────────────────
// Only four KPIs — the rest of the breakdown lives inside the Analytics chart.
export default function AdminMetrics() {
  const metrics: MetricCardProps[] = [
    {
      label: "Total Documents",
      value: 1250,
      icon: <FolderIcon className="size-6 text-primary dark:text-secondary" />,
      iconBg: "bg-[#e0e7ff]",
    },
    {
      label: "Pending Documents",
      value: 120,
      icon: <ClockIcon className="size-6 text-[#f59e0b]" />,
      iconBg: "bg-[#fef3c7]",
    },
    {
      label: "On-Going",
      value: 300,
      icon: <RefreshIcon className="size-6 text-[#0284c7]" />,
      iconBg: "bg-[#e0f2fe]",
    },
    {
      label: "Completed",
      value: 830,
      icon: <CheckCircleIcon className="size-6 text-[#10b981]" />,
      iconBg: "bg-[#d1fae5]",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}

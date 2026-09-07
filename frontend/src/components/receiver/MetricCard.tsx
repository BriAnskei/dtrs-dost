// components/receiver/ReceiverMetrics.tsx

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
}

function MetricCard({ label, value, icon, iconBg }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-[#fee8d6] bg-[#fffaf5] p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center justify-center w-12 h-12 rounded-xl ${iconBg}`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <span className="text-sm text-[#4b5563] dark:text-gray-400">{label}</span>
          <h4 className="mt-1 font-bold text-[#1f2937] text-title-sm dark:text-white/90">
            {value.toLocaleString()}
          </h4>
        </div>
      </div>
    </div>
  );
}

// ── Icons ────────────────────────────────────────────────────────────────────

function UploadIcon({ className }: { className?: string }) {
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
        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4"
      />
    </svg>
  );
}

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReceiverMetrics() {
  const metrics: MetricCardProps[] = [
    {
      label: "Total Uploaded",
      value: 115,
      icon: <UploadIcon className="size-6 text-[#3b82f6]" />,
      iconBg: "bg-[#e0e7ff]",
    },
    {
      label: "On-Queue",
      value: 15,
      icon: <QueueIcon className="size-6 text-[#f59e0b]" />,
      iconBg: "bg-[#fef3c7]",
    },
    {
      label: "Received",
      value: 100,
      icon: <CheckCircleIcon className="size-6 text-[#10b981]" />,
      iconBg: "bg-[#d1fae5]",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 md:gap-6">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}

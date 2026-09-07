// components/super_admin/SuperAdminUserStats.tsx

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
          <h4 className="mt-2 font-bold text-[#1f2937] text-title-sm dark:text-white/90">
            {value.toLocaleString()}
          </h4>
        </div>
      </div>
    </div>
  );
}

function UsersIcon({ className }: { className?: string }) {
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
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}
function UserCheckIcon({ className }: { className?: string }) {
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
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11l2 2 4-4m-6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
function UserXIcon({ className }: { className?: string }) {
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
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 11l4 4m0-4l-4 4" />
    </svg>
  );
}
function BuildingIcon({ className }: { className?: string }) {
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
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

export default function SuperAdminUserStats() {
  const cards: MetricCardProps[] = [
    {
      label: "Total Users",
      value: 50,
      icon: <UsersIcon className="size-6 text-primary dark:text-secondary" />,
      iconBg: "bg-[#e0e7ff]",
    },
    {
      label: "Active Users",
      value: 45,
      icon: <UserCheckIcon className="size-6 text-[#10b981]" />,
      iconBg: "bg-[#d1fae5]",
    },
    {
      label: "Inactive Users",
      value: 5,
      icon: <UserXIcon className="size-6 text-[#ef4444]" />,
      iconBg: "bg-[#fee2e2]",
    },
    {
      label: "Total Divisions",
      value: 5,
      icon: <BuildingIcon className="size-6 text-[#0284c7]" />,
      iconBg: "bg-[#e0f2fe]",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-6">
      {cards.map((c) => (
        <MetricCard key={c.label} {...c} />
      ))}
    </div>
  );
}

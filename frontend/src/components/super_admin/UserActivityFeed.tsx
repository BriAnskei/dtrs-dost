// components/superadmin/UserActivityFeed.tsx
import { useState } from "react";
import { MoreDotIcon } from "../../icons";
import Pagination from "../common/Pagination";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

type ActivityType = "upload" | "validate" | "status" | "login" | "permission";

interface ActivityEntry {
  id: number;
  type: ActivityType;
  actor: string;
  role: "Receiver" | "Admin" | "Super Admin";
  action: string;
  count?: number;
  unit?: string;
  time: string;
  date: "today" | "yesterday";
}

const activities: ActivityEntry[] = [
  {
    id: 1,
    type: "upload",
    actor: "Maria Santos",
    role: "Receiver",
    action: "uploaded",
    count: 20,
    unit: "documents",
    time: "2:45 PM",
    date: "today",
  },
  {
    id: 2,
    type: "validate",
    actor: "Ramon Garcia",
    role: "Admin",
    action: "validated",
    count: 35,
    unit: "documents",
    time: "1:30 PM",
    date: "today",
  },
  {
    id: 3,
    type: "status",
    actor: "Liza Torres",
    role: "Admin",
    action: "updated status on",
    count: 10,
    unit: "documents",
    time: "11:10 AM",
    date: "today",
  },
  {
    id: 4,
    type: "login",
    actor: "Juan dela Cruz",
    role: "Receiver",
    action: "logged in",
    time: "9:02 AM",
    date: "today",
  },
  {
    id: 5,
    type: "permission",
    actor: "Super Admin",
    role: "Super Admin",
    action: "changed permissions for Ana Reyes",
    time: "8:30 AM",
    date: "today",
  },
  {
    id: 6,
    type: "upload",
    actor: "Carlos Mendoza",
    role: "Receiver",
    action: "uploaded",
    count: 8,
    unit: "documents",
    time: "4:55 PM",
    date: "yesterday",
  },
  {
    id: 7,
    type: "validate",
    actor: "Ramon Garcia",
    role: "Admin",
    action: "validated",
    count: 22,
    unit: "documents",
    time: "3:20 PM",
    date: "yesterday",
  },
  {
    id: 8,
    type: "permission",
    actor: "Super Admin",
    role: "Super Admin",
    action: "added new user — Ana Reyes (Receiver)",
    time: "10:00 AM",
    date: "yesterday",
  },
];

const typeConfig: Record<
  ActivityType,
  { bg: string; icon: React.ReactNode; dot: string }
> = {
  upload: {
    dot: "bg-[#3b82f6]",
    bg: "bg-[#e0e7ff]",
    icon: (
      <svg
        className="w-3.5 h-3.5 text-[#3b82f6]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0L8 8m4-4l4 4"
        />
      </svg>
    ),
  },
  validate: {
    dot: "bg-[#10b981]",
    bg: "bg-[#d1fae5]",
    icon: (
      <svg
        className="w-3.5 h-3.5 text-[#10b981]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  status: {
    dot: "bg-[#f59e0b]",
    bg: "bg-[#fef3c7]",
    icon: (
      <svg
        className="w-3.5 h-3.5 text-[#f59e0b]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    ),
  },
  login: {
    dot: "bg-[#3b82f6]",
    bg: "bg-[#e0e7ff]",
    icon: (
      <svg
        className="w-3.5 h-3.5 text-[#3b82f6]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
        />
      </svg>
    ),
  },
  permission: {
    dot: "bg-[#0284c7]",
    bg: "bg-[#e0f2fe]",
    icon: (
      <svg
        className="w-3.5 h-3.5 text-[#0284c7]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    ),
  },
};

const roleBadge: Record<ActivityEntry["role"], string> = {
  Receiver: "text-primary dark:text-secondary",
  Admin: "text-success",
  "Super Admin": "text-secondary dark:text-secondary/80",
};

function buildDescription(a: ActivityEntry): string {
  if (a.count !== undefined) return `${a.action} ${a.count} ${a.unit}`;
  return a.action;
}

const ITEMS_PER_PAGE = 4;

export default function UserActivityFeed() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<ActivityType | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const allFiltered = activities.filter((a) => filter === "all" || a.type === filter);
  const totalPages = Math.max(1, Math.ceil(allFiltered.length / ITEMS_PER_PAGE));
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE;
  const pagedItems = allFiltered.slice(pageStart, pageStart + ITEMS_PER_PAGE);

  const filterOptions: { label: string; value: ActivityType | "all" }[] = [
    { label: "All Activity", value: "all" },
    { label: "Uploads", value: "upload" },
    { label: "Validations", value: "validate" },
    { label: "Status Changes", value: "status" },
    { label: "Logins", value: "login" },
    { label: "Permissions", value: "permission" },
  ];

  function ActivityItem({ entry }: { entry: ActivityEntry }) {
    const cfg = typeConfig[entry.type];
    return (
      <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-white/[0.05] last:border-0">
        {/* Icon */}
        <div
          className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg ${cfg.bg}`}
        >
          {cfg.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                {entry.actor}
              </span>
              <span
                className={`text-theme-xs font-medium px-2 py-0.5 rounded-full ${roleBadge[entry.role]}`}
              >
                {entry.role}
              </span>
            </div>
            <span className="text-theme-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
              {entry.time}
            </span>
          </div>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {buildDescription(entry)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            User Activity
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Real-time actions across all roles
          </p>
        </div>
        <div className="relative inline-block">
          <button className="dropdown-toggle" onClick={() => setIsOpen((v) => !v)}>
            <MoreDotIcon className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" />
          </button>
          <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="w-40 p-2">
            <DropdownItem
              onItemClick={() => setIsOpen(false)}
              className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              Export Log
            </DropdownItem>
          </Dropdown>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setCurrentPage(1);
              setFilter(f.value);
            }}
            className={`px-3 py-1 rounded-full text-theme-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-white dark:bg-secondary"
                : "bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/[0.08]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {pagedItems.length === 0 ? (
        <p className="text-center text-theme-sm text-gray-400 dark:text-gray-500 py-8">
          No activity matches this filter.
        </p>
      ) : (
        <>
          <div className="space-y-0">
            {pagedItems.map((e) => (
              <ActivityItem key={e.id} entry={e} />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

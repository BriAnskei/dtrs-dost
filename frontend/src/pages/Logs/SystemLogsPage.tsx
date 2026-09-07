import { useEffect, useMemo, useRef, useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleKey = "Super Admin" | "Admin" | "Receiver";
type ActionType =
  | "Login"
  | "Logout"
  | "Upload"
  | "Update Status"
  | "Edit Document"
  | "Archive Document"
  | "Delete Document"
  | "Validate Document"
  | "View Document"
  | "Access Denied";
type LogStatus = "Success" | "Failed";

interface SystemLog {
  id: number;
  timestamp: string; // ISO string
  user: string;
  role: RoleKey;
  action: ActionType;
  documentCode?: string;
  documentSubject?: string;
  ipAddress: string;
  status: LogStatus;
  detail?: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_LOGS: SystemLog[] = [
  {
    id: 1,
    timestamp: "2024-02-05T08:03:11Z",
    user: "Maria Santos",
    role: "Admin",
    action: "Login",
    ipAddress: "192.168.1.10",
    status: "Success",
  },
  {
    id: 2,
    timestamp: "2024-02-05T08:05:44Z",
    user: "Ana Reyes",
    role: "Receiver",
    action: "Login",
    ipAddress: "192.168.1.22",
    status: "Success",
  },
  {
    id: 3,
    timestamp: "2024-02-05T08:12:30Z",
    user: "Ana Reyes",
    role: "Receiver",
    action: "Upload",
    documentCode: "INC-2024-007",
    documentSubject: "Leave of Absence Request",
    ipAddress: "192.168.1.22",
    status: "Success",
  },
  {
    id: 4,
    timestamp: "2024-02-05T08:20:01Z",
    user: "Maria Santos",
    role: "Admin",
    action: "Validate Document",
    documentCode: "INC-2024-007",
    documentSubject: "Leave of Absence Request",
    ipAddress: "192.168.1.10",
    status: "Success",
  },
  {
    id: 5,
    timestamp: "2024-02-05T08:35:18Z",
    user: "Juan dela Cruz",
    role: "Admin",
    action: "Login",
    ipAddress: "10.0.0.5",
    status: "Success",
  },
  {
    id: 6,
    timestamp: "2024-02-05T08:40:52Z",
    user: "Juan dela Cruz",
    role: "Admin",
    action: "Upload",
    documentCode: "INC-2024-008",
    documentSubject: "Quarterly Budget Report",
    ipAddress: "10.0.0.5",
    status: "Success",
  },
  {
    id: 7,
    timestamp: "2024-02-05T08:55:09Z",
    user: "Ramon Garcia",
    role: "Admin",
    action: "Login",
    ipAddress: "10.0.0.8",
    status: "Failed",
    detail: "Incorrect password",
  },
  {
    id: 8,
    timestamp: "2024-02-05T08:56:22Z",
    user: "Ramon Garcia",
    role: "Admin",
    action: "Login",
    ipAddress: "10.0.0.8",
    status: "Success",
  },
  {
    id: 9,
    timestamp: "2024-02-05T09:10:44Z",
    user: "Maria Santos",
    role: "Admin",
    action: "Update Status",
    documentCode: "INC-2024-006",
    documentSubject: "Legal Compliance Audit Report",
    ipAddress: "192.168.1.10",
    status: "Success",
  },
  {
    id: 10,
    timestamp: "2024-02-05T09:15:30Z",
    user: "Carlos Mendoza",
    role: "Receiver",
    action: "Login",
    ipAddress: "192.168.1.30",
    status: "Success",
  },
  {
    id: 11,
    timestamp: "2024-02-05T09:20:11Z",
    user: "Carlos Mendoza",
    role: "Receiver",
    action: "Upload",
    documentCode: "INC-2024-009",
    documentSubject: "Equipment Procurement Request",
    ipAddress: "192.168.1.30",
    status: "Failed",
    detail: "File exceeds maximum size limit",
  },
  {
    id: 12,
    timestamp: "2024-02-05T09:30:05Z",
    user: "Admin System",
    role: "Super Admin",
    action: "Login",
    ipAddress: "127.0.0.1",
    status: "Success",
  },
  {
    id: 13,
    timestamp: "2024-02-05T09:45:19Z",
    user: "Admin System",
    role: "Super Admin",
    action: "Edit Document",
    documentCode: "INC-2024-001",
    documentSubject: "Budget Proposal FY2024",
    ipAddress: "127.0.0.1",
    status: "Success",
  },
  {
    id: 14,
    timestamp: "2024-02-05T10:02:33Z",
    user: "Ramon Garcia",
    role: "Admin",
    action: "View Document",
    documentCode: "INC-2024-008",
    documentSubject: "Quarterly Budget Report",
    ipAddress: "10.0.0.8",
    status: "Success",
  },
  {
    id: 15,
    timestamp: "2024-02-05T10:18:45Z",
    user: "Liza Torres",
    role: "Receiver",
    action: "Login",
    ipAddress: "192.168.1.41",
    status: "Success",
  },
  {
    id: 16,
    timestamp: "2024-02-05T10:25:00Z",
    user: "Liza Torres",
    role: "Receiver",
    action: "Upload",
    documentCode: "INC-2024-010",
    documentSubject: "Staff Training Schedule",
    ipAddress: "192.168.1.41",
    status: "Success",
  },
  {
    id: 17,
    timestamp: "2024-02-05T10:40:12Z",
    user: "Juan dela Cruz",
    role: "Admin",
    action: "Archive Document",
    documentCode: "INC-2024-003",
    documentSubject: "Staff Regularization Endorsement",
    ipAddress: "10.0.0.5",
    status: "Success",
  },
  {
    id: 18,
    timestamp: "2024-02-05T10:55:08Z",
    user: "Maria Santos",
    role: "Admin",
    action: "Delete Document",
    documentCode: "INC-2024-002",
    documentSubject: "Infrastructure Maintenance Request",
    ipAddress: "192.168.1.10",
    status: "Success",
  },
  {
    id: 19,
    timestamp: "2024-02-05T11:10:29Z",
    user: "Ana Reyes",
    role: "Receiver",
    action: "Access Denied",
    ipAddress: "192.168.1.22",
    status: "Failed",
    detail: "Feature disabled by administrator",
  },
  {
    id: 20,
    timestamp: "2024-02-05T11:30:47Z",
    user: "Admin System",
    role: "Super Admin",
    action: "Delete Document",
    documentCode: "INC-2024-004",
    documentSubject: "Procurement of Office Supplies",
    ipAddress: "127.0.0.1",
    status: "Success",
  },
  {
    id: 21,
    timestamp: "2024-02-05T11:45:00Z",
    user: "Ramon Garcia",
    role: "Admin",
    action: "Validate Document",
    documentCode: "INC-2024-010",
    documentSubject: "Staff Training Schedule",
    ipAddress: "10.0.0.8",
    status: "Success",
  },
  {
    id: 22,
    timestamp: "2024-02-05T12:00:15Z",
    user: "Carlos Mendoza",
    role: "Receiver",
    action: "Upload",
    documentCode: "INC-2024-011",
    documentSubject: "Travel Order Request",
    ipAddress: "192.168.1.30",
    status: "Success",
  },
  {
    id: 23,
    timestamp: "2024-02-05T12:20:33Z",
    user: "Maria Santos",
    role: "Admin",
    action: "Logout",
    ipAddress: "192.168.1.10",
    status: "Success",
  },
  {
    id: 24,
    timestamp: "2024-02-05T12:22:10Z",
    user: "Juan dela Cruz",
    role: "Admin",
    action: "Update Status",
    documentCode: "INC-2024-011",
    documentSubject: "Travel Order Request",
    ipAddress: "10.0.0.5",
    status: "Success",
  },
  {
    id: 25,
    timestamp: "2024-02-05T12:45:55Z",
    user: "Liza Torres",
    role: "Receiver",
    action: "Logout",
    ipAddress: "192.168.1.41",
    status: "Success",
  },
  {
    id: 26,
    timestamp: "2024-02-05T13:10:02Z",
    user: "Admin System",
    role: "Super Admin",
    action: "Edit Document",
    documentCode: "INC-2024-005",
    documentSubject: "Annual Performance Review Results",
    ipAddress: "127.0.0.1",
    status: "Success",
  },
  {
    id: 27,
    timestamp: "2024-02-05T13:30:18Z",
    user: "Ana Reyes",
    role: "Receiver",
    action: "Logout",
    ipAddress: "192.168.1.22",
    status: "Success",
  },
  {
    id: 28,
    timestamp: "2024-02-05T13:55:40Z",
    user: "Ramon Garcia",
    role: "Admin",
    action: "Access Denied",
    ipAddress: "10.0.0.8",
    status: "Failed",
    detail: "Insufficient role permissions",
  },
  {
    id: 29,
    timestamp: "2024-02-05T14:05:22Z",
    user: "Carlos Mendoza",
    role: "Receiver",
    action: "Logout",
    ipAddress: "192.168.1.30",
    status: "Success",
  },
  {
    id: 30,
    timestamp: "2024-02-05T14:30:00Z",
    user: "Admin System",
    role: "Super Admin",
    action: "Logout",
    ipAddress: "127.0.0.1",
    status: "Success",
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: RoleKey[] = ["Super Admin", "Admin", "Receiver"];
const ALL_ACTIONS: ActionType[] = [
  "Login",
  "Logout",
  "Upload",
  "Update Status",
  "Edit Document",
  "Archive Document",
  "Delete Document",
  "Validate Document",
  "View Document",
  "Access Denied",
];
const ALL_STATUSES: LogStatus[] = ["Success", "Failed"];
const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: d.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

function actionMeta(action: ActionType): {
  color: string;
  icon: React.ReactNode;
} {
  const cls = (c: string) => `w-3.5 h-3.5 ${c}`;
  const map: Record<ActionType, { color: string; icon: React.ReactNode }> = {
    Login: {
      color:
        "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400",
      icon: (
        <svg
          className={cls("")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h7a2 2 0 012 2v1"
          />
        </svg>
      ),
    },
    Logout: {
      color: "text-gray-500 bg-gray-100 dark:bg-white/[0.06] dark:text-gray-400",
      icon: (
        <svg
          className={cls("")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
          />
        </svg>
      ),
    },
    Upload: {
      color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400",
      icon: (
        <svg
          className={cls("")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      ),
    },
    "Update Status": {
      color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400",
      icon: (
        <svg
          className={cls("")}
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
    "Edit Document": {
      color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10 dark:text-violet-400",
      icon: (
        <svg
          className={cls("")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
    },
    "Archive Document": {
      color: "text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400",
      icon: (
        <svg
          className={cls("")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
      ),
    },
    "Delete Document": {
      color: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400",
      icon: (
        <svg
          className={cls("")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      ),
    },
    "Validate Document": {
      color: "text-teal-600 bg-teal-50 dark:bg-teal-500/10 dark:text-teal-400",
      icon: (
        <svg
          className={cls("")}
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
    "View Document": {
      color: "text-sky-600 bg-sky-50 dark:bg-sky-500/10 dark:text-sky-400",
      icon: (
        <svg
          className={cls("")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ),
    },
    "Access Denied": {
      color: "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400",
      icon: (
        <svg
          className={cls("")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      ),
    },
  };
  return map[action];
}

function roleBadge(role: RoleKey) {
  const map: Record<RoleKey, string> = {
    "Super Admin": "text-primary dark:text-blue-300",
    Admin: "text-violet-700 dark:text-violet-300",
    Receiver: "text-gray-600 dark:text-gray-300",
  };
  return map[role];
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

function exportToCSV(logs: SystemLog[]) {
  const headers = [
    "ID",
    "Timestamp",
    "User",
    "Role",
    "Action",
    "Document Code",
    "Document Subject",
    "IP Address",
    "Status",
    "Detail",
  ];
  const rows = logs.map((l) => [
    l.id,
    new Date(l.timestamp).toLocaleString("en-PH"),
    l.user,
    l.role,
    l.action,
    l.documentCode ?? "",
    l.documentSubject ?? "",
    l.ipAddress,
    l.status,
    l.detail ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `system-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-5 py-4 flex flex-col gap-1">
      <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-2xl font-bold ${accent ?? "text-gray-800 dark:text-white/90"}`}>
        {value}
      </p>
      {sub && <p className="text-theme-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

// ─── Multi-select dropdown filter ─────────────────────────────────────────────

function MultiSelectFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: T[];
  selected: T[];
  onChange: (vals: T[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggle(val: T) {
    onChange(
      selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val],
    );
  }

  const allSelected = selected.length === 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition whitespace-nowrap"
      >
        <span>{allSelected ? label : `${label} (${selected.length})`}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-[180px] max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-gray-900 shadow-lg">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.05] text-theme-xs text-gray-700 dark:text-gray-300"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-gray-300 dark:border-gray-600 accent-secondary"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Log Card ──────────────────────────────────────────────────────────

function MobileLogCard({ log }: { log: SystemLog }) {
  const { date, time } = formatTimestamp(log.timestamp);
  const meta = actionMeta(log.action);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-theme-xs font-medium ${meta.color}`}
          >
            {meta.icon}
            {log.action}
          </span>
          <span
            className={`px-2 py-0.5 rounded-md text-theme-xs font-medium ${roleBadge(log.role)}`}
          >
            {log.role}
          </span>
        </div>
        <span
          className={`flex-shrink-0 text-theme-xs font-semibold ${log.status === "Success" ? "text-emerald-600" : "text-danger"}`}
        >
          {log.status}
        </span>
      </div>
      <div>
        <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          {log.user}
        </p>
        {log.documentCode && (
          <p className="text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5">
            <span className="font-mono font-semibold text-primary dark:text-secondary">
              {log.documentCode}
            </span>
            {" — "}
            {log.documentSubject}
          </p>
        )}
        {log.detail && (
          <p className="text-theme-xs text-danger dark:text-red-400 mt-0.5 italic">
            {log.detail}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-white/[0.05]">
        <span className="text-theme-xs text-gray-400 dark:text-gray-500 font-mono">
          {log.ipAddress}
        </span>
        <span className="text-theme-xs text-gray-400 dark:text-gray-500">
          {date} · {time}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SystemLogsPage() {
  const [search, setSearch] = useState("");
  const [filterRoles, setFilterRoles] = useState<RoleKey[]>([]);
  const [filterActions, setFilterActions] = useState<ActionType[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<LogStatus[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MOCK_LOGS.filter((l) => {
      if (
        q &&
        !l.user.toLowerCase().includes(q) &&
        !l.action.toLowerCase().includes(q) &&
        !(l.documentCode ?? "").toLowerCase().includes(q)
      )
        return false;
      if (filterRoles.length && !filterRoles.includes(l.role)) return false;
      if (filterActions.length && !filterActions.includes(l.action)) return false;
      if (filterStatuses.length && !filterStatuses.includes(l.status)) return false;
      const ts = new Date(l.timestamp);
      if (filterDateFrom && ts < new Date(filterDateFrom)) return false;
      if (filterDateTo && ts > new Date(filterDateTo + "T23:59:59Z")) return false;
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [search, filterRoles, filterActions, filterStatuses, filterDateFrom, filterDateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const hasFilters =
    search ||
    filterRoles.length ||
    filterActions.length ||
    filterStatuses.length ||
    filterDateFrom ||
    filterDateTo;

  function clearFilters() {
    setSearch("");
    setFilterRoles([]);
    setFilterActions([]);
    setFilterStatuses([]);
    setFilterDateFrom("");
    setFilterDateTo("");
    setPage(1);
  }

  // Reset page when filters change
  useMemo(() => {
    setPage(1);
  }, [filtered.length]);

  // ── Stats ──
  const totalSuccess = MOCK_LOGS.filter((l) => l.status === "Success").length;
  const totalFailed = MOCK_LOGS.filter((l) => l.status === "Failed").length;
  const totalLogins = MOCK_LOGS.filter((l) => l.action === "Login").length;

  return (
    <>
      <PageMeta
        title="System Logs | Document Tracking System"
        description="View all user session activity, document actions, and system events."
      />
      <PageBreadcrumb pageTitle="System Logs" />

      <div className="space-y-6">
        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Events" value={MOCK_LOGS.length} sub="All time" />
          <StatCard
            label="Successful"
            value={totalSuccess}
            sub={`${Math.round((totalSuccess / MOCK_LOGS.length) * 100)}% of all events`}
            accent="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            label="Failed"
            value={totalFailed}
            sub="Errors & denied"
            accent="text-danger dark:text-red-400"
          />
          <StatCard
            label="Login Sessions"
            value={totalLogins}
            sub="Across all roles"
            accent="text-secondary dark:text-secondary"
          />
        </div>

        <ComponentCard
          title="System Logs"
          headerRight={
            <button
              onClick={() => exportToCSV(filtered)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#e2e8f0] text-[#475569] hover:bg-gray-50 text-theme-sm font-medium transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export CSV
            </button>
          }
        >
          {/* ── Filters ── */}
          <div className="flex flex-col gap-3 mb-5">
            {/* Row 1: search + dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
                    />
                  </svg>
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by user, action, or document code…"
                  className="w-full pl-9 pr-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:placeholder-gray-500 transition"
                />
              </div>
              {/* Dropdowns */}
              <div className="flex gap-2 flex-wrap items-center">
                <MultiSelectFilter
                  label="Role"
                  options={ALL_ROLES}
                  selected={filterRoles}
                  onChange={setFilterRoles}
                />
                <MultiSelectFilter
                  label="Action"
                  options={ALL_ACTIONS}
                  selected={filterActions}
                  onChange={setFilterActions}
                />
                <MultiSelectFilter
                  label="Status"
                  options={ALL_STATUSES}
                  selected={filterStatuses}
                  onChange={setFilterStatuses}
                />
              </div>
            </div>

            {/* Row 2: date range + clear */}
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex flex-col gap-1">
                <label className="text-theme-xs text-gray-500 dark:text-gray-400 font-medium">
                  From
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-theme-xs text-gray-500 dark:text-gray-400 font-medium">
                  To
                </label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
                />
              </div>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-danger whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden space-y-3">
            {paginated.length === 0 ? (
              <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] px-5 py-10 text-center text-gray-400 text-theme-sm">
                No log entries match your filters.
              </div>
            ) : (
              paginated.map((log) => <MobileLogCard key={log.id} log={log} />)
            )}
          </div>

          {/* ── Desktop Table ── */}
          <div className="hidden md:block rounded-xl border border-gray-200 dark:border-white/[0.05] bg-white dark:bg-white/[0.03] overflow-hidden @container">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#f1f5f9] bg-[#f1f5f9] dark:border-white/[0.05]">
                    {[
                      "Timestamp",
                      "User / Role",
                      "Action",
                      "Document",
                      "IP Address",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-theme-xs font-semibold text-primary dark:text-gray-300 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f5f9] dark:divide-white/[0.05]">
                  {paginated.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-gray-400 text-theme-sm"
                      >
                        No log entries match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginated.map((log) => {
                      const { date, time } = formatTimestamp(log.timestamp);
                      const meta = actionMeta(log.action);
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Timestamp */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-theme-xs font-medium text-gray-700 dark:text-gray-200">
                              {date}
                            </p>
                            <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-mono">
                              {time}
                            </p>
                          </td>

                          {/* User / Role */}
                          <td className="px-4 py-3">
                            <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                              {log.user}
                            </p>
                            <span
                              className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-theme-xs font-medium ${roleBadge(log.role)}`}
                            >
                              {log.role}
                            </span>
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-theme-xs font-medium ${meta.color}`}
                            >
                              {meta.icon}
                              {log.action}
                            </span>
                          </td>

                          {/* Document */}
                          <td className="px-4 py-3">
                            {log.documentCode ? (
                              <div>
                                <span className="font-mono text-theme-xs font-semibold text-primary dark:text-secondary bg-primary/5 dark:bg-secondary/10 px-1.5 py-0.5 rounded">
                                  {log.documentCode}
                                </span>
                                <p
                                  className="text-theme-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-[180px] truncate"
                                  title={log.documentSubject}
                                >
                                  {log.documentSubject}
                                </p>
                              </div>
                            ) : (
                              <span className="text-theme-xs text-gray-300 dark:text-gray-600">
                                —
                              </span>
                            )}
                            {log.detail && (
                              <p className="text-theme-xs text-danger dark:text-red-400 mt-0.5 italic">
                                {log.detail}
                              </p>
                            )}
                          </td>

                          {/* IP */}
                          <td className="px-4 py-3">
                            <span className="font-mono text-theme-xs text-gray-500 dark:text-gray-400">
                              {log.ipAddress}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-theme-xs font-semibold
                              ${
                                log.status === "Success"
                                  ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400"
                                  : "text-danger bg-red-50 dark:bg-red-500/10 dark:text-red-400"
                              }`}
                            >
                              {log.status === "Success" ? (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              )}
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination footer ── */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 dark:border-white/[0.05]">
              {/* Left: count + page size */}
              <div className="flex items-center gap-3">
                <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                  Showing{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–
                    {Math.min(page * pageSize, filtered.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-600 dark:text-gray-300">
                    {filtered.length}
                  </span>{" "}
                  entries
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 text-theme-xs rounded-md border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-gray-600 dark:text-gray-300 focus:outline-none"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      Show {n}
                    </option>
                  ))}
                </select>
              </div>

              {/* Right: page buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2 py-1 rounded-md text-theme-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 rounded-md text-theme-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                  .reduce<(number | "…")[]>((acc, n, i, arr) => {
                    if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("…");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((n, i) =>
                    n === "…" ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="px-2 py-1 text-theme-xs text-gray-400"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        onClick={() => setPage(n as number)}
                        className={`px-2.5 py-1 rounded-md text-theme-xs font-medium transition-colors
                          ${
                            page === n
                              ? "bg-secondary text-white"
                              : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                          }`}
                      >
                        {n}
                      </button>
                    ),
                  )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 py-1 rounded-md text-theme-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-2 py-1 rounded-md text-theme-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          </div>

          {/* Mobile pagination */}
          {paginated.length > 0 && (
            <div className="md:hidden flex items-center justify-between mt-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg text-theme-sm border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg text-theme-sm border border-gray-200 dark:border-white/[0.08] text-gray-500 dark:text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </ComponentCard>
      </div>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import Badge from "../../ui/badge/Badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../ui/table";

// ─── Types ────────────────────────────────────────────────────────────────────

type UserRole = "Super Admin" | "Admin" | "Receiver" | "Division";
type AccountStatus = "Active" | "Disabled";

interface SystemUser {
  id: number;
  name: string;
  title: string;
  role: UserRole;
  email: string;
  contact: string;
  status: AccountStatus;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockUsers: SystemUser[] = [
  {
    id: 1,
    name: "Engr. Ricardo Villanueva",
    title: "Provincial Engineer",
    role: "Admin",
    email: "r.villanueva@peo.gov.ph",
    contact: "+63 917 123 4567",
    status: "Active",
  },
  {
    id: 2,
    name: "Maria Santos",
    title: "Administrative Officer IV",
    role: "Super Admin",
    email: "m.santos@peo.gov.ph",
    contact: "+63 918 234 5678",
    status: "Active",
  },
  {
    id: 3,
    name: "Engr. Juan dela Cruz",
    title: "Highway Division Head",
    role: "Admin",
    email: "j.delacruz@peo.gov.ph",
    contact: "+63 919 345 6789",
    status: "Active",
  },
  {
    id: 4,
    name: "Ana Reyes",
    title: "Records Officer I",
    role: "Receiver",
    email: "a.reyes@peo.gov.ph",
    contact: "+63 920 456 7890",
    status: "Active",
  },
  {
    id: 5,
    name: "Engr. Carlos Mendoza",
    title: "Bridge Division Head",
    role: "Admin",
    email: "c.mendoza@peo.gov.ph",
    contact: "+63 921 567 8901",
    status: "Disabled",
  },
  {
    id: 6,
    name: "Liza Torres",
    title: "Administrative Aide VI",
    role: "Receiver",
    email: "l.torres@peo.gov.ph",
    contact: "+63 922 678 9012",
    status: "Active",
  },
  {
    id: 7,
    name: "Engr. Ramon Garcia",
    title: "Planning Division Head",
    role: "Admin",
    email: "r.garcia@peo.gov.ph",
    contact: "+63 923 789 0123",
    status: "Active",
  },
  {
    id: 8,
    name: "Engr. Paolo Tan",
    title: "Equipment Division Head",
    role: "Division",
    email: "p.tan@peo.gov.ph",
    contact: "+63 924 890 1234",
    status: "Active",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = ["Super Admin", "Admin", "Receiver", "Division"];

function getRoleBadgeColor(role: UserRole) {
  if (role === "Super Admin") return "info";
  if (role === "Admin") return "warning";
  if (role === "Division") return "success";
  return "light" as const;
}

// Helper function for status styling
function getStatusStyles(status: AccountStatus) {
  if (status === "Active") {
    return "text-success";
  }
  return "text-red-600 font-semibold"; // Explicit red for Disabled
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface UserFormState {
  name: string;
  title: string;
  role: UserRole;
  email: string;
  contact: string;
}

const EMPTY_FORM: UserFormState = {
  name: "",
  title: "",
  role: "Admin",
  email: "",
  contact: "",
};

function UserFormModal({
  mode,
  initial,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial: UserFormState;
  onSave: (data: UserFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UserFormState>(initial);
  const [errors, setErrors] = useState<Partial<UserFormState>>({});

  function validate() {
    const e: Partial<UserFormState> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email.";
    if (!form.contact.trim()) e.contact = "Contact is required.";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    onSave(form);
  }

  function field(
    label: string,
    key: keyof UserFormState,
    type = "text",
    placeholder = "",
  ) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-theme-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </label>
        <input
          type={type}
          value={form[key] as string}
          onChange={(e) => {
            setForm((f) => ({ ...f, [key]: e.target.value }));
            setErrors((er) => ({ ...er, [key]: undefined }));
          }}
          placeholder={placeholder}
          className={`px-3 py-2 text-theme-sm rounded-lg border bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 transition dark:bg-white/[0.03] dark:text-gray-200 dark:placeholder-gray-500 ${
            errors[key]
              ? "border-danger focus:ring-danger/30"
              : "border-gray-200 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08]"
          }`}
        />
        {errors[key] && <span className="text-theme-xs text-danger">{errors[key]}</span>}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-gray-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.08]">
          <div>
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {mode === "add" ? "Add New User" : "Edit User"}
            </h2>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {mode === "add" ? "Create a new system account." : "Update user details."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/[0.06] dark:hover:text-gray-200 transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {field("Full Name", "name", "text", "e.g. Engr. Juan dela Cruz")}
          {field("Job Title / Position", "title", "text", "e.g. Highway Division Head")}

          {/* Role select */}
          <div className="flex flex-col gap-1">
            <label className="text-theme-xs font-medium text-gray-600 dark:text-gray-400">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as UserRole }))
              }
              className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500">
              {form.role === "Super Admin" &&
                "Manages documents and verifies PDF content."}
              {form.role === "Admin" && "Provincial Engineers and Division Heads."}
              {form.role === "Receiver" && "Updates document receipt and status."}
              {form.role === "Division" &&
                "Division units that submit and track documents."}
            </p>
          </div>

          {field("Email", "email", "email", "e.g. user@peo.gov.ph")}
          {field("Contact Number", "contact", "tel", "e.g. +63 917 123 4567")}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/[0.08]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            {mode === "add" ? "Add User" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Disable Modal ────────────────────────────────────────────────────

function ConfirmDisableModal({
  user,
  onConfirm,
  onClose,
}: {
  user: SystemUser;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const isDisabling = user.status === "Active";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-gray-900 p-6 space-y-4">
        {/* Icon */}
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center ${isDisabling ? "bg-danger/10" : "bg-success/10"}`}
        >
          {isDisabling ? (
            <svg
              className="w-5 h-5 text-danger"
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
          ) : (
            <svg
              className="w-5 h-5 text-success"
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
          )}
        </div>

        <div>
          <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {isDisabling ? "Disable Account" : "Enable Account"}
          </h3>
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            {isDisabling
              ? `Are you sure you want to disable ${user.name}'s account? They will no longer be able to log in.`
              : `Re-enable ${user.name}'s account? They will regain access to the system.`}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border-white/[0.08] dark:text-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-theme-sm font-medium text-white rounded-lg transition-colors ${
              isDisabling
                ? "bg-danger hover:bg-danger/90"
                : "bg-success hover:bg-success/90"
            }`}
          >
            {isDisabling ? "Yes, Disable" : "Yes, Enable"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Kebab Menu ───────────────────────────────────────────────────────────────

function KebabMenu({
  user,
  onEdit,
  onToggleStatus,
}: {
  user: SystemUser;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isDisabled = user.status === "Disabled";

  const actions = [
    {
      label: "Edit",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
      handler: () => {
        onEdit();
        setOpen(false);
      },
      danger: false,
    },
    {
      label: isDisabled ? "Enable" : "Disable",
      icon: isDisabled ? (
        <svg
          className="w-4 h-4"
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
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      ),
      handler: () => {
        onToggleStatus();
        setOpen(false);
      },
      danger: !isDisabled,
    },
  ];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/[0.06] dark:hover:text-gray-200 transition-colors focus:outline-none"
        title="More actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 right-0 mt-1 w-36 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/[0.08] dark:bg-gray-900">
          {actions.map((action, idx) => (
            <button
              key={action.label}
              onClick={action.handler}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-theme-xs transition-colors
                ${idx === 0 ? "rounded-t-lg" : ""}
                ${idx === actions.length - 1 ? "rounded-b-lg" : ""}
                ${
                  action.danger
                    ? "text-danger hover:bg-red-50 dark:hover:bg-red-500/10"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05]"
                }`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────

function MobileCard({
  user,
  onEdit,
  onToggleStatus,
}: {
  user: SystemUser;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] p-4 space-y-3">
      {/* Top row: name + kebab */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90 leading-snug">
            {user.name}
          </p>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {user.title}
          </p>
        </div>
        <KebabMenu user={user} onEdit={onEdit} onToggleStatus={onToggleStatus} />
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
            Role
          </p>
          <div className="mt-1">
            <Badge size="sm" color={getRoleBadgeColor(user.role)}>
              {user.role}
            </Badge>
          </div>
        </div>
        <div>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
            Status
          </p>
          {/* Status with explicit red for Disabled - Mobile */}
          <div className="mt-1">
            <span className={`text-theme-sm font-medium ${getStatusStyles(user.status)}`}>
              {user.status}
            </span>
          </div>
        </div>
        <div className="col-span-2">
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
            Email
          </p>
          <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5 truncate">
            {user.email}
          </p>
        </div>
        <div>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
            Contact
          </p>
          <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
            {user.contact}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function UserManagementTable() {
  const [users, setUsers] = useState<SystemUser[]>(mockUsers);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<UserRole | "All">("All");
  const [filterStatus, setFilterStatus] = useState<AccountStatus | "All">("All");

  // Modal state
  const [addModal, setAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<SystemUser | null>(null);
  const [disableTarget, setDisableTarget] = useState<SystemUser | null>(null);

  // ── Handlers ──

  function handleAdd(data: UserFormState) {
    const newUser: SystemUser = {
      id: Date.now(),
      ...data,
      status: "Active",
    };
    setUsers((prev) => [newUser, ...prev]);
    setAddModal(false);
  }

  function handleEdit(data: UserFormState) {
    if (!editTarget) return;
    setUsers((prev) => prev.map((u) => (u.id === editTarget.id ? { ...u, ...data } : u)));
    setEditTarget(null);
  }

  function handleToggleStatus() {
    if (!disableTarget) return;
    setUsers((prev) =>
      prev.map((u) =>
        u.id === disableTarget.id
          ? { ...u, status: u.status === "Active" ? "Disabled" : "Active" }
          : u,
      ),
    );
    setDisableTarget(null);
  }

  // ── Filtered list ──

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.title.toLowerCase().includes(q);
    const matchesRole = filterRole === "All" || u.role === filterRole;
    const matchesStatus = filterStatus === "All" || u.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const hasFilters = search || filterRole !== "All" || filterStatus !== "All";

  return (
    <>
      <div className="space-y-4">
        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          {/* Left: search + filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end flex-1">
            {/* Search */}
            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
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
                placeholder="Search by name, email, or position…"
                className="w-full pl-9 pr-4 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:placeholder-gray-500 transition"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap items-center">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as UserRole | "All")}
                className="flex-1 min-w-[130px] px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
              >
                <option value="All">All Roles</option>
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as AccountStatus | "All")}
                className="flex-1 min-w-[130px] px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 transition"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
              </select>

              {hasFilters && (
                <button
                  onClick={() => {
                    setSearch("");
                    setFilterRole("All");
                    setFilterStatus("All");
                  }}
                  className="px-3 py-2 text-theme-sm text-gray-500 hover:text-danger border border-gray-200 rounded-lg hover:border-danger/40 transition-colors dark:border-white/[0.08] dark:text-gray-400 dark:hover:text-danger whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Right: Add User button */}
          <button
            onClick={() => setAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors whitespace-nowrap"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>

        {/* ── Mobile Cards (< md) ── */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] px-5 py-10 text-center text-gray-400 text-theme-sm">
              No users match your filters.
            </div>
          ) : (
            filtered.map((user) => (
              <MobileCard
                key={user.id}
                user={user}
                onEdit={() => setEditTarget(user)}
                onToggleStatus={() => setDisableTarget(user)}
              />
            ))
          )}
          {filtered.length > 0 && (
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 text-right px-1">
              Showing{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {filtered.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {users.length}
              </span>{" "}
              users
            </p>
          )}
        </div>

        {/* ── Desktop Table (≥ md) ── */}
        <div className="hidden md:block rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="dark:border-white/[0.05]">
                <TableRow>
                  {[
                    "Name / Position",
                    "Role",
                    "Email",
                    "Contact",
                    "Account Status",
                    "Action",
                  ].map((col) => (
                    <TableCell
                      key={col}
                      isHeader
                      className="px-4 py-3 font-semibold text-primary text-start text-theme-xs dark:text-gray-300 whitespace-nowrap"
                    >
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody className="dark:divide-white/[0.05]">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-gray-400 text-theme-sm"
                    >
                      No users match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Name / Position */}
                      <TableCell className="px-4 py-3">
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {user.name}
                        </span>
                        <span className="block text-gray-400 text-theme-xs dark:text-gray-500 mt-0.5">
                          {user.title}
                        </span>
                      </TableCell>

                      {/* Role */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Badge size="sm" color={getRoleBadgeColor(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>

                      {/* Email */}
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                        <span className="block truncate max-w-[200px]" title={user.email}>
                          {user.email}
                        </span>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400 whitespace-nowrap">
                        {user.contact}
                      </TableCell>

                      {/* Account Status - with explicit red for Disabled */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`text-theme-sm font-medium ${getStatusStyles(user.status)}`}
                        >
                          {user.status}
                        </span>
                      </TableCell>

                      {/* Action */}
                      <TableCell className="px-4 py-3">
                        <KebabMenu
                          user={user}
                          onEdit={() => setEditTarget(user)}
                          onToggleStatus={() => setDisableTarget(user)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 dark:border-white/[0.05]">
              <span className="text-theme-xs text-gray-400 dark:text-gray-500">
                Showing{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {filtered.length}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-600 dark:text-gray-300">
                  {users.length}
                </span>{" "}
                users
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {addModal && (
        <UserFormModal
          mode="add"
          initial={EMPTY_FORM}
          onSave={handleAdd}
          onClose={() => setAddModal(false)}
        />
      )}

      {editTarget && (
        <UserFormModal
          mode="edit"
          initial={{
            name: editTarget.name,
            title: editTarget.title,
            role: editTarget.role,
            email: editTarget.email,
            contact: editTarget.contact,
          }}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {disableTarget && (
        <ConfirmDisableModal
          user={disableTarget}
          onConfirm={handleToggleStatus}
          onClose={() => setDisableTarget(null)}
        />
      )}
    </>
  );
}

import { useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleKey = "receiver" | "admin" | "division";

interface Permission {
  key: string;
  label: string;
  description: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: RoleKey;
  avatar: string;
  division?: string;
}

// key = permissionKey, value = true (granted) | false (revoked) | undefined (inherits role default)
type UserOverrides = Record<string, boolean>;

// ─── Permission Definitions ───────────────────────────────────────────────────

const PERMISSIONS_BY_ROLE: Record<RoleKey, Permission[]> = {
  receiver: [
    {
      key: "receiver.upload",
      label: "Upload Document",
      description: "Submit document letters for validation by admin/super admin.",
    },
    {
      key: "receiver.track_status",
      label: "Track Upload Status",
      description: "View the approval status of submitted documents.",
    },
  ],
  admin: [
    {
      key: "admin.upload_incoming",
      label: "Upload Incoming Document",
      description: "Directly upload incoming document letters without validation.",
    },
    {
      key: "admin.upload_outgoing",
      label: "Upload Outgoing Document",
      description: "Directly upload outgoing document letters without validation.",
    },
    {
      key: "admin.view_incoming",
      label: "View Incoming Documents",
      description: "Access and browse all incoming document records.",
    },
    {
      key: "admin.view_outgoing",
      label: "View Outgoing Documents",
      description: "Access and browse all outgoing document records.",
    },
    {
      key: "admin.update_incoming_status",
      label: "Update Incoming Status",
      description: "Change the processing status of incoming documents.",
    },
    {
      key: "admin.edit_document",
      label: "Edit Document",
      description: "Modify document details and metadata.",
    },
    {
      key: "admin.archive_document",
      label: "Archive Document",
      description: "Move documents to the archive for long-term storage.",
    },
    {
      key: "admin.delete_document",
      label: "Delete Document",
      description: "Permanently remove documents from the system.",
    },
    {
      key: "admin.validate_document",
      label: "Validate Receiver Uploads",
      description: "Review and approve or reject documents submitted by receivers.",
    },
  ],
  division: [
    {
      key: "division.routed_to",
      label: "Routed To",
      description:
        "Assign or change which division/user an incoming document is routed to.",
    },
    {
      key: "division.edit_status",
      label: "Edit Status & Remarks",
      description:
        "Change the processing status and edit remarks on incoming documents. Status rollbacks (e.g. Complete → On-Going) require a remarks note.",
    },
  ],
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_USERS: User[] = [
  {
    id: 1,
    name: "Ana Reyes",
    email: "ana.reyes@peo.gov.ph",
    role: "receiver",
    avatar: "AR",
  },
  {
    id: 2,
    name: "Carlos Mendoza",
    email: "carlos.mendoza@peo.gov.ph",
    role: "receiver",
    avatar: "CM",
  },
  {
    id: 3,
    name: "Liza Torres",
    email: "liza.torres@peo.gov.ph",
    role: "receiver",
    avatar: "LT",
  },
  {
    id: 4,
    name: "Maria Santos",
    email: "maria.santos@peo.gov.ph",
    role: "admin",
    avatar: "MS",
  },
  {
    id: 5,
    name: "Juan dela Cruz",
    email: "juan.delacruz@peo.gov.ph",
    role: "admin",
    avatar: "JD",
  },
  {
    id: 6,
    name: "Ramon Garcia",
    email: "ramon.garcia@peo.gov.ph",
    role: "admin",
    avatar: "RG",
  },
  {
    id: 7,
    name: "Engr. Paolo Tan",
    email: "p.tan@peo.gov.ph",
    role: "division",
    avatar: "PT",
    division: "Equipment Division",
  },
  {
    id: 8,
    name: "Engr. Sofia Reyes",
    email: "s.reyes@peo.gov.ph",
    role: "division",
    avatar: "SR",
    division: "Maintenance Division",
  },
  {
    id: 9,
    name: "Engr. Benjo Cruz",
    email: "b.cruz@peo.gov.ph",
    role: "division",
    avatar: "BC",
    division: "Materials Division",
  },
];

// All role-level defaults are ON initially
function buildDefaultRoleToggles(): Record<RoleKey, Record<string, boolean>> {
  return {
    receiver: Object.fromEntries(PERMISSIONS_BY_ROLE.receiver.map((p) => [p.key, true])),
    admin: Object.fromEntries(PERMISSIONS_BY_ROLE.admin.map((p) => [p.key, true])),
    division: Object.fromEntries(PERMISSIONS_BY_ROLE.division.map((p) => [p.key, true])),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Toggle({
  enabled,
  onChange,
  disabled = false,
  size = "md",
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const track = size === "sm" ? "w-8 h-4" : "w-10 h-5";
  const thumb = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <button
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={`relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/50
        ${track}
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
        ${enabled ? "bg-secondary" : "bg-gray-300 dark:bg-gray-600"}`}
    >
      <span
        className={`inline-block rounded-full bg-white shadow transition-transform duration-200
          ${thumb}
          ${enabled ? translate : "translate-x-0.5"}`}
      />
    </button>
  );
}

function avatarColors(initials: string) {
  const palette = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  ];
  const idx = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % palette.length;
  return palette[idx];
}

// ─── Effective permission resolver ────────────────────────────────────────────

function resolvePermission(
  permKey: string,
  roleDefault: boolean,
  userOverride: boolean | undefined,
): boolean {
  // Super admin can grant back even if role is off
  if (userOverride !== undefined) return userOverride;
  return roleDefault;
}

// ─── Role Defaults Card ───────────────────────────────────────────────────────

function RoleDefaultsCard({
  role,
  permissions,
  roleToggles,
  onToggle,
}: {
  role: RoleKey;
  permissions: Permission[];
  roleToggles: Record<string, boolean>;
  onToggle: (key: string, val: boolean) => void;
}) {
  const enabledCount = Object.values(roleToggles).filter(Boolean).length;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
        <div>
          <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Role Defaults
          </h3>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Applies to all{" "}
            {role === "receiver"
              ? "Receivers"
              : role === "admin"
                ? "Admins"
                : "Divisions"}{" "}
            unless overridden per user.
          </p>
        </div>
        <span className="text-theme-xs font-medium text-secondary bg-secondary/10 px-2.5 py-1 rounded-full">
          {enabledCount} / {permissions.length} enabled
        </span>
      </div>

      {/* Permissions list */}
      <ul className="divide-y divide-gray-100 dark:divide-white/[0.05]">
        {permissions.map((perm) => (
          <li
            key={perm.key}
            className="flex items-center justify-between gap-4 px-5 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-theme-sm font-medium text-gray-700 dark:text-gray-200">
                {perm.label}
              </p>
              <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                {perm.description}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`text-theme-xs font-medium ${roleToggles[perm.key] ? "text-secondary" : "text-gray-400 dark:text-gray-500"}`}
              >
                {roleToggles[perm.key] ? "On" : "Off"}
              </span>
              <Toggle
                enabled={roleToggles[perm.key]}
                onChange={(v) => onToggle(perm.key, v)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── User Override Row ────────────────────────────────────────────────────────

function UserOverrideRow({
  user,
  permissions,
  roleToggles,
  overrides,
  onOverrideChange,
  onClearOverride,
}: {
  user: User;
  permissions: Permission[];
  roleToggles: Record<string, boolean>;
  overrides: UserOverrides;
  onOverrideChange: (userId: number, permKey: string, val: boolean) => void;
  onClearOverride: (userId: number, permKey: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const overrideCount = Object.keys(overrides).filter(
    (k) => overrides[k] !== undefined && overrides[k] !== roleToggles[k],
  ).length;

  return (
    <div className="border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-hidden bg-white dark:bg-white/[0.03]">
      {/* User row header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors text-left"
      >
        {/* Avatar */}
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-theme-xs font-semibold ${avatarColors(user.avatar)}`}
        >
          {user.avatar}
        </span>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          {user.role === "division" ? (
            <>
              <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90 truncate">
                {user.division}
              </p>
              <p className="text-theme-xs text-gray-400 dark:text-gray-500 truncate">
                {user.name}
              </p>
            </>
          ) : (
            <>
              <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90 truncate">
                {user.name}
              </p>
              <p className="text-theme-xs text-gray-400 dark:text-gray-500 truncate">
                {user.email}
              </p>
            </>
          )}
        </div>

        {/* Override badge */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {overrideCount > 0 ? (
            <span className="text-theme-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
              {overrideCount} override{overrideCount > 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-theme-xs text-gray-400 dark:text-gray-500">
              Role defaults
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded permissions */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/[0.05]">
          <div className="px-4 py-2 bg-gray-50/60 dark:bg-white/[0.02]">
            <p className="text-theme-xs text-gray-400 dark:text-gray-500">
              Overrides take priority over role defaults. Super admin can grant access
              even when the role default is off.
            </p>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {permissions.map((perm) => {
              const roleDefault = roleToggles[perm.key];
              const userOverride = overrides[perm.key]; // undefined = no override
              const effective = resolvePermission(perm.key, roleDefault, userOverride);
              const hasOverride = userOverride !== undefined;
              const overrideConflicts = hasOverride && userOverride !== roleDefault;

              return (
                <li
                  key={perm.key}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-theme-sm text-gray-700 dark:text-gray-200">
                        {perm.label}
                      </p>
                      {hasOverride && (
                        <span
                          className={`text-theme-xs font-medium px-1.5 py-0.5 rounded ${
                            userOverride
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-red-50 text-danger dark:bg-red-500/10 dark:text-red-400"
                          }`}
                        >
                          {userOverride ? "Granted" : "Revoked"}
                        </span>
                      )}
                      {!roleDefault && !hasOverride && (
                        <span className="text-theme-xs text-gray-400 dark:text-gray-500 italic">
                          disabled by role
                        </span>
                      )}
                    </div>
                    {!roleDefault && hasOverride && userOverride && (
                      <p className="text-theme-xs text-amber-500 dark:text-amber-400 mt-0.5">
                        Granted even though role default is off.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Clear override button */}
                    {hasOverride && (
                      <button
                        onClick={() => onClearOverride(user.id, perm.key)}
                        className="text-theme-xs text-gray-400 hover:text-danger dark:text-gray-500 dark:hover:text-danger underline underline-offset-2 transition-colors"
                        title="Remove override — revert to role default"
                      >
                        Reset
                      </button>
                    )}
                    <span
                      className={`text-theme-xs font-medium ${
                        effective ? "text-secondary" : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {effective ? "On" : "Off"}
                    </span>
                    <Toggle
                      size="sm"
                      enabled={effective}
                      onChange={(v) => onOverrideChange(user.id, perm.key, v)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Per-User Overrides Section ───────────────────────────────────────────────

function UserOverridesSection({
  role,
  users,
  permissions,
  roleToggles,
  allOverrides,
  onOverrideChange,
  onClearOverride,
}: {
  role: RoleKey;
  users: User[];
  permissions: Permission[];
  roleToggles: Record<string, boolean>;
  allOverrides: Record<number, UserOverrides>;
  onOverrideChange: (userId: number, permKey: string, val: boolean) => void;
  onClearOverride: (userId: number, permKey: string) => void;
}) {
  const roleUsers = users.filter((u) => u.role === role);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
          Per-User Overrides
        </h3>
        <span className="text-theme-xs text-gray-400 dark:text-gray-500">
          — {roleUsers.length} user{roleUsers.length !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-theme-xs text-gray-400 dark:text-gray-500 -mt-1">
        Click a user to expand and override individual permissions. "Reset" removes the
        override and restores the role default.
      </p>

      <div className="space-y-2">
        {roleUsers.map((user) => (
          <UserOverrideRow
            key={user.id}
            user={user}
            permissions={permissions}
            roleToggles={roleToggles}
            overrides={allOverrides[user.id] ?? {}}
            onOverrideChange={onOverrideChange}
            onClearOverride={onClearOverride}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Save confirmation toast (local) ─────────────────────────────────────────

function SaveToast({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-900 dark:bg-white/[0.08] border border-white/10 shadow-xl text-white text-theme-sm animate-fade-in">
      <svg
        className="w-4 h-4 text-secondary flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Access control settings saved.
      <button
        onClick={onDismiss}
        className="ml-1 text-gray-400 hover:text-white transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AccessControlPage() {
  const [activeRole, setActiveRole] = useState<RoleKey>("receiver");
  const [roleToggles, setRoleToggles] = useState(buildDefaultRoleToggles);
  // { [userId]: { [permKey]: boolean } }
  const [userOverrides, setUserOverrides] = useState<Record<number, UserOverrides>>({});
  const [toastVisible, setToastVisible] = useState(false);

  function handleRoleToggle(role: RoleKey, key: string, val: boolean) {
    setRoleToggles((prev) => ({
      ...prev,
      [role]: { ...prev[role], [key]: val },
    }));
  }

  function handleUserOverride(userId: number, permKey: string, val: boolean) {
    setUserOverrides((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? {}), [permKey]: val },
    }));
  }

  function handleClearOverride(userId: number, permKey: string) {
    setUserOverrides((prev) => {
      const updated = { ...(prev[userId] ?? {}) };
      delete updated[permKey];
      return { ...prev, [userId]: updated };
    });
  }

  function handleSave() {
    // In production: POST to API
    console.log("[AccessControl] Saving:", { roleToggles, userOverrides });
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3500);
  }

  const permissions = PERMISSIONS_BY_ROLE[activeRole];

  const ROLE_LABELS: Record<RoleKey, string> = {
    receiver: "Receiver",
    admin: "Admin",
    division: "Division",
  };

  return (
    <>
      <PageMeta
        title="Access Control | Document Tracking System"
        description="Manage feature access by role and individual user overrides."
      />
      <PageBreadcrumb pageTitle="Access Control" />

      <div className="space-y-6">
        <ComponentCard
          title="Access Control"
          headerRight={
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-white text-theme-sm font-medium hover:bg-secondary/90 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </button>
          }
        >
          {/* Info banner */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 mb-6">
            <svg
              className="w-4 h-4 text-primary dark:text-secondary flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"
              />
            </svg>
            <p className="text-theme-xs text-primary dark:text-secondary/90 leading-relaxed">
              <span className="font-semibold">Super Admin access is always full.</span>{" "}
              Role defaults apply to all users in a role. Per-user overrides take priority
              — including granting access when the role default is off.
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-white/[0.04] rounded-lg w-fit mb-6">
            {(Object.keys(PERMISSIONS_BY_ROLE) as RoleKey[]).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-5 py-2 rounded-md text-theme-sm font-medium transition-all duration-150
                  ${
                    activeRole === role
                      ? "bg-white dark:bg-white/[0.08] text-primary dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>

          {/* Two-section layout */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-6 items-start">
            {/* Left — role defaults */}
            <RoleDefaultsCard
              role={activeRole}
              permissions={permissions}
              roleToggles={roleToggles[activeRole]}
              onToggle={(key, val) => handleRoleToggle(activeRole, key, val)}
            />

            {/* Right — per-user overrides */}
            <UserOverridesSection
              role={activeRole}
              users={MOCK_USERS}
              permissions={permissions}
              roleToggles={roleToggles[activeRole]}
              allOverrides={userOverrides}
              onOverrideChange={handleUserOverride}
              onClearOverride={handleClearOverride}
            />
          </div>
        </ComponentCard>
      </div>

      <SaveToast visible={toastVisible} onDismiss={() => setToastVisible(false)} />
    </>
  );
}

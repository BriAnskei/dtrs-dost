import { useEffect, useState } from "react";
import type {
  AdminAccount,
  AdminPermissions,
  UserManagementPermission,
} from "../types/access-controll-types";
import Toggle from "./Toggle";

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

export default function AdminAccessRow({
  admin,
  permissions,
  savedValues,
  isSaving,
  onSave,
}: {
  admin: AdminAccount;
  permissions: UserManagementPermission[];
  /** The committed (last saved) permissions for this admin — owned by the parent. */
  savedValues: AdminPermissions;
  /** True while this specific admin's save/revoke request is in flight. */
  isSaving: boolean;
  /** Called only when this row's Save button is pressed. Scoped to this one admin. */
  onSave: (adminId: string, values: AdminPermissions) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<AdminPermissions>(savedValues);
  const [justSaved, setJustSaved] = useState(false);

  // Stay in sync if this admin's saved permissions change from outside
  // (e.g. right after this row's own save commits back down through props).
  useEffect(() => {
    setDraft(savedValues);
  }, [savedValues]);

  const functionKeys = permissions.filter((p) => p.key !== "user_management.access");
  const hasAccess = draft["user_management.access"];
  const savedGrantedCount = functionKeys.filter((p) => savedValues[p.key]).length;
  const hasChanges = permissions.some((p) => draft[p.key] !== savedValues[p.key]);

  function labelFor(key: string) {
    return permissions.find((p) => p.key === key)?.label ?? key;
  }

  function handleToggle(key: string, val: boolean) {
    setDraft((prev) => {
      const next = { ...prev, [key]: val };
      // Revoking master access clears every function underneath it, in this draft only.
      if (key === "user_management.access" && !val) {
        functionKeys.forEach((p) => {
          next[p.key] = false;
        });
      }
      // Turning off a permission that other permissions depend on
      // (e.g. deactivate) clears those dependents too, so the draft
      // never reaches a combination the backend would reject.
      if (!val) {
        functionKeys
          .filter((p) => p.dependsOn === key)
          .forEach((p) => {
            next[p.key] = false;
          });
      }
      return next;
    });
    setJustSaved(false);
  }

  function handleGrantAll() {
    setDraft((prev) => {
      const next = { ...prev };
      functionKeys.forEach((p) => {
        next[p.key] = true;
      });
      return next;
    });
    setJustSaved(false);
  }

  function handleRevokeAll() {
    setDraft((prev) => {
      const next = { ...prev };
      functionKeys.forEach((p) => {
        next[p.key] = false;
      });
      return next;
    });
    setJustSaved(false);
  }

  function handleDiscard() {
    setDraft(savedValues);
  }

  function handleSave() {
    onSave(admin.id, draft);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  return (
    <div
      className={`border rounded-xl overflow-hidden bg-white dark:bg-white/[0.03] transition-colors ${
        hasChanges
          ? "border-amber-300 dark:border-amber-500/40"
          : "border-gray-200 dark:border-white/[0.08]"
      }`}
    >
      {/* Row header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/70 dark:hover:bg-white/[0.02] transition-colors text-left"
      >
        <span
          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-theme-xs font-semibold ${avatarColors(admin.avatar)}`}
        >
          {admin.avatar}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90 truncate">
            {admin.name}
          </p>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 truncate">
            {admin.email}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasChanges && !isSaving && (
            <span className="text-theme-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
              Unsaved
            </span>
          )}
          {isSaving && (
            <span className="text-theme-xs font-medium text-gray-500 bg-gray-100 dark:bg-white/[0.05] dark:text-gray-400 px-2 py-0.5 rounded-full">
              Saving…
            </span>
          )}
          {savedValues["user_management.access"] ? (
            <span className="text-theme-xs font-medium text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
              {savedGrantedCount} function{savedGrantedCount === 1 ? "" : "s"} granted
            </span>
          ) : (
            <span className="text-theme-xs font-medium text-gray-400 bg-gray-100 dark:bg-white/[0.05] dark:text-gray-500 px-2 py-0.5 rounded-full">
              No access
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded permission editor */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/[0.05]">
          {permissions.map((perm) => {
            const isMaster = perm.key === "user_management.access";
            const checked = draft[perm.key];
            const dependencyMet = !perm.dependsOn || draft[perm.dependsOn];
            const locked = !isMaster && (!hasAccess || !dependencyMet);
            const isDanger = perm.risk === "high";

            return (
              <div
                key={perm.key}
                className={`flex items-center justify-between gap-4 py-3 pr-4 ${
                  isMaster
                    ? "px-4 bg-gray-50/60 dark:bg-white/[0.02]"
                    : "ml-6 pl-4 border-l-2 border-gray-100 dark:border-white/[0.06]"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={`text-theme-sm ${
                        isMaster
                          ? "font-medium text-gray-800 dark:text-white/90"
                          : "text-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {perm.label}
                    </p>
                    {isDanger && (
                      <span className="text-theme-xs font-medium text-danger bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded">
                        High risk
                      </span>
                    )}
                  </div>
                  <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                    {perm.description}
                  </p>
                  {locked && (
                    <p className="text-theme-xs text-amber-500 dark:text-amber-400 mt-0.5 italic">
                      {!hasAccess
                        ? 'Grant "Access User Management" first.'
                        : `Grant "${labelFor(perm.dependsOn!)}" first.`}
                    </p>
                  )}
                  {isMaster && hasAccess && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        type="button"
                        onClick={handleGrantAll}
                        disabled={isSaving}
                        className="text-theme-xs text-secondary hover:underline underline-offset-2 disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        Grant all functions
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <button
                        type="button"
                        onClick={handleRevokeAll}
                        disabled={isSaving}
                        className="text-theme-xs text-gray-400 hover:text-danger hover:underline underline-offset-2 disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        Revoke all
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-theme-xs font-medium ${
                      checked && !locked
                        ? isDanger
                          ? "text-danger"
                          : "text-secondary"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {checked && !locked ? "On" : "Off"}
                  </span>
                  <Toggle
                    size="sm"
                    enabled={checked && !locked}
                    disabled={locked || isSaving}
                    variant={isDanger ? "danger" : "default"}
                    onChange={(v) => handleToggle(perm.key, v)}
                  />
                </div>
              </div>
            );
          })}

          {/* Row-level save bar — scoped to this admin only */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/60 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/[0.05]">
            <span className="text-theme-xs text-gray-400 dark:text-gray-500">
              {isSaving
                ? "Saving your changes…"
                : justSaved
                  ? `Saved for ${admin.name}.`
                  : hasChanges
                    ? "You have unsaved changes for this admin."
                    : "No pending changes."}
            </span>
            <div className="flex items-center gap-2">
              {hasChanges && !isSaving && (
                <button
                  type="button"
                  onClick={handleDiscard}
                  className="px-3 py-1.5 text-theme-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                >
                  Discard
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className={`px-3.5 py-1.5 text-theme-xs font-medium rounded-lg transition-colors ${
                  hasChanges && !isSaving
                    ? "text-white bg-primary hover:bg-primary/90"
                    : "text-gray-400 bg-gray-100 dark:bg-white/[0.05] dark:text-gray-500 cursor-not-allowed"
                }`}
              >
                {isSaving ? "Saving…" : `Save for ${admin.name.split(" ")[0]}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

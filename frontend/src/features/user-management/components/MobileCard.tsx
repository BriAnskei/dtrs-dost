// ─── Mobile Card ──────────────────────────────────────────────────────────────

import Badge from "../../../components/ui/badge/Badge";
import { getRoleBadgeColor, getStatusStyles } from "../helpers";
import type { SystemUser } from "../type/mock.types";
import KebabMenu from "./kebebMenu";

export default function MobileCard({
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

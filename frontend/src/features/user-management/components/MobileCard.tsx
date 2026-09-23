import Badge from "../../../components/ui/badge/Badge";
import KebabMenu, {
  DisableIcon,
  EditIcon,
  KeyIcon,
} from "../../../components/ui/kebab-menu/KebabMenu";
import { getRoleBadgeColor } from "../helpers";
import type { SystemUser } from "../types/user.type";

export default function MobileCard({
  user,
  onEdit,
  onResetPassword,
  onToggleStatus,
}: {
  user: SystemUser;
  onEdit: () => void;
  onResetPassword: () => void;
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
            {user.position}
          </p>
        </div>
        <KebabMenu
          actions={[
            {
              label: "Edit",
              icon: <EditIcon />,
              handler: onEdit,
            },
            {
              label: "Reset Password",
              icon: <KeyIcon />,
              handler: onResetPassword,
            },
            {
              label: "Disable",
              icon: <DisableIcon />,
              handler: onToggleStatus,
              danger: true,
            },
          ]}
        />
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
          {user.role === "Division" && user.divisionName && (
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-1">
              {user.divisionName}
            </p>
          )}
        </div>
        <div>
          <p className="text-theme-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
            Contact
          </p>
          <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
            {user.contact}
          </p>
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
            Created At
          </p>
          <p className="text-theme-xs text-gray-700 dark:text-gray-300 mt-0.5">
            {user.createtAt}
          </p>
        </div>
      </div>
    </div>
  );
}

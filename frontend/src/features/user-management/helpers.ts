import type { AccountStatus, UserRole } from "./type/user.type";

export function getRoleBadgeColor(role: UserRole) {
  if (role === "Admin") return "warning";
  if (role === "Division") return "success";
  if (role === "Receiver") return "info";
  return "light" as const;
}

export function getStatusStyles(status: AccountStatus) {
  if (status === "Active") {
    return "text-success";
  }
  return "text-red-500 font-semibold"; // Explicit red for Disabled
}

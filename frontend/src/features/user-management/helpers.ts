import type { AccountStatus, UserRole } from "./type/user.type";

export function getRoleBadgeColor(role: UserRole) {
  if (role === "Super Admin") return "info";
  if (role === "Admin") return "warning";
  if (role === "Division") return "success";
  return "light" as const;
}

// Helper function for status styling
export function getStatusStyles(status: AccountStatus) {
  if (status === "Active") {
    return "text-success";
  }
  return "text-red-600 font-semibold"; // Explicit red for Disabled
}

import { useMemo } from "react";
import { NAV_ITEMS, type NavItem } from "../config/navConfig";
import type { Roles } from "../context/currentUser/curr-user.type";
import { useUser } from "../context/currentUser/use-user";

/**
 * Map each role to its dashboard route. The Dashboard nav item has a generic
 * path of "/" in the config, but the actual dashboard pages are role-specific
 * (e.g. "/super-admin/dashboard"). We substitute the real route here so that
 * the sidebar link points directly to the dashboard and the `isActive` check
 * in AppSidebar matches only dashboard routes, not every path under "/".
 */
const DASHBOARD_PATHS: Partial<Record<Exclude<Roles, 4>, string>> = {
  1: "/super-admin/dashboard",
  2: "/admin/dashboard",
  3: "/receiving-officer/dashboard",
};

/**
 * Convert the raw config items (which use the same NavItem shape) into the
 * filtered list based on the current role. This hook is tiny and memoised so
 * the sidebar re‑renders only when the role changes.
 */
export const useFilteredNav = (): NavItem[] => {
  const { currentUser } = useUser();

  const role = currentUser?.role_id;

  // If no role is set (e.g., not logged in) we return an empty array – the UI
  // can decide to show a guest navigation set elsewhere.
  const currentRole = role as Roles | undefined;

  return useMemo(() => {
    if (!currentRole) return [];

    const filterItem = (item: NavItem): NavItem | null => {
      if (!item.roles.includes(currentRole)) return null;

      let path = item.path;
      if (item.name === "Dashboard" && currentRole !== 4) {
        path = DASHBOARD_PATHS[currentRole] ?? item.path;
      }

      const filteredSub = item.subItems?.filter((sub) => sub.roles.includes(currentRole));

      return {
        ...item,
        path,
        subItems: filteredSub,
      };
    };

    return NAV_ITEMS.map(filterItem).filter(Boolean) as NavItem[];
  }, [currentRole]);
};

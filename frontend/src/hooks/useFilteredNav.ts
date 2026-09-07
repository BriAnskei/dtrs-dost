import { useMemo } from "react";
import { NAV_ITEMS, type NavItem } from "../config/navConfig";
import { type Roles, userUser } from "../context/UserContext";

/**
 * Convert the raw config items (which use the same NavItem shape) into the
 * filtered list based on the current role. This hook is tiny and memoised so
 * the sidebar re‑renders only when the role changes.
 */
export const useFilteredNav = (): NavItem[] => {
  const { role } = userUser();

  // If no role is set (e.g., not logged in) we return an empty array – the UI
  // can decide to show a guest navigation set elsewhere.
  const currentRole = role as Roles | undefined;

  return useMemo(() => {
    if (!currentRole) return [];

    const filterItem = (item: NavItem): NavItem | null => {
      if (!item.roles.includes(currentRole)) return null;

      const filteredSub = item.subItems?.filter((sub) => sub.roles.includes(currentRole));

      return {
        ...item,
        subItems: filteredSub,
      };
    };

    return NAV_ITEMS.map(filterItem).filter(Boolean) as NavItem[];
  }, [currentRole]);
};

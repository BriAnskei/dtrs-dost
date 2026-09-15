import { useMemo } from "react";
import { type NavItem, OTHERS_NAV_ITEMS } from "../config/navConfig";
import { useUser } from "../context/currentUser/user-user";
import type { Roles } from "../features/user-management/type/user.type";

/**
 * Mirrors useFilteredNav but operates on the "others" navigation items.
 * It filters based on the current user role, keeping only items (and sub‑items)
 * that include the role in their `roles` array.
 */
export const useFilteredOthersNav = (): NavItem[] => {
  const { currentUser } = useUser();

  const role = currentUser?.role_id;

  const currentRole = role as Roles | undefined;

  return useMemo(() => {
    if (!currentRole) return [];

    const filterItem = (item: NavItem): NavItem | null => {
      if (!item.roles.includes(currentRole)) return null;
      const filteredSub = item.subItems?.filter((sub) => sub.roles.includes(currentRole));
      return {
        ...item,
        subItems: filteredSub,
      } as NavItem;
    };

    return OTHERS_NAV_ITEMS.map(filterItem).filter(Boolean) as NavItem[];
  }, [currentRole]);
};

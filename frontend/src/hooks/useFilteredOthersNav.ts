import { useMemo } from "react";
import { type NavItem, OTHERS_NAV_ITEMS } from "../config/navConfig";
import type { Roles } from "../context/currentUser/curr-user.type";
import { useUser } from "../context/currentUser/use-user";

export const useFilteredOthersNav = (): NavItem[] => {
  const { currentUser } = useUser();

  const role = currentUser?.role_id;
  const currentRole = role as Roles | undefined;

  return useMemo(() => {
    if (!currentUser || !currentRole) {
      return [];
    }

    const canAccess = (item: Pick<NavItem, "roles" | "hasPermission">) => {
      if (!item.roles.includes(currentRole)) {
        return false;
      }

      if (item.hasPermission && !item.hasPermission(currentUser)) {
        return false;
      }

      return true;
    };

    const filterItem = (item: NavItem): NavItem | null => {
      if (!canAccess(item)) {
        return null;
      }

      if (!item.subItems) {
        return item;
      }

      const filteredSubItems = item.subItems.filter((subItem) => canAccess(subItem));

      if (filteredSubItems.length === 0) {
        return null;
      }

      return {
        ...item,
        subItems: filteredSubItems,
      };
    };

    return OTHERS_NAV_ITEMS.map(filterItem).filter(
      (item): item is NavItem => item !== null,
    );
  }, [currentUser, currentRole]);
};

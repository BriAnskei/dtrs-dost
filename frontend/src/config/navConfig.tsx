import type { Roles, User } from "../context/currentUser/curr-user.type";
import { UserManagementPermissionEnum } from "../features/auth/authorization/enum/user-management-permission";
import { hasUserManagementPermission } from "../features/auth/authorization/helpers/has-user-management-permission";
import {
  AdministrationIcon,
  AssignedDocumentsIcon,
  BoxCubeIcon,
  Document,
  GridIcon,
  Notification,
  SettingIcon,
  SystemLogsIcon,
  Upload,
} from "../icons";

export interface NavItem {
  name: string;
  icon: React.ReactNode;
  path?: string;
  roles: Roles[];
  hasPermission?: (user: User) => boolean;
  subItems?: NavSubItem[];
}

export interface NavSubItem {
  name: string;
  path: string;
  roles: Roles[];
  hasPermission?: (user: User) => boolean;
}

// Super Admin
const SUPER_ADMIN_ROUTES: NavItem[] = [
  {
    name: "System Logs",
    path: "/activities",
    icon: <SystemLogsIcon />,
    roles: [1],
  },
  {
    name: "Setting",
    path: "/Seting",
    icon: <SettingIcon />,
    roles: [1],
  },
];

// Receiver Officer
const RECEIVER_ROUTES: NavItem[] = [
  {
    name: "Submit Doc",
    path: "/incoming-upload",
    icon: <Upload />,
    roles: [3],
  },
  {
    name: "Uploaded Doc",
    path: "/my-uploads",
    icon: <Document />,
    roles: [3],
  },
  {
    name: "Invalid Docs",
    path: "/invalid-documents",
    icon: <BoxCubeIcon />,
    roles: [3],
  },
];

// Division
const DIVISION_ROUTES: NavItem[] = [
  {
    name: "Assigned Documents",
    path: "/division/assigned-documents",
    icon: <AssignedDocumentsIcon />,
    roles: [4],
  },
];

// Main Navigation
export const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    icon: <GridIcon />,
    path: "/",
    roles: [1, 2, 3],
  },

  // Super Admin and Admin
  {
    name: "Documents",
    icon: <></>,
    roles: [1, 2],
    subItems: [
      {
        name: "New Doc",
        path: "/upload-direct",
        roles: [1, 2],
      },
      {
        name: "Extracted Docs",
        path: "/extracted-queues",
        roles: [1, 2],
      },
      {
        name: "Invalid Docs",
        path: "/upload-invalid",
        roles: [1, 2],
      },
      {
        name: "Incoming",
        path: "/incoming",
        roles: [1, 2],
      },
      {
        name: "Outgoing",
        path: "/outgoing",
        roles: [1, 2],
      },
      {
        name: "Stale Docs",
        path: "/admin/stale-documents",
        roles: [2],
      },
    ],
  },

  // Receiver Officer: separate top-level navigation
  ...RECEIVER_ROUTES,

  // Division
  ...DIVISION_ROUTES,

  // Notifications
  {
    name: "Notification",
    icon: <Notification />,
    path: "/notification",
    roles: [1, 2, 3, 4],
  },
];

// Other Navigation
export const OTHERS_NAV_ITEMS: NavItem[] = [
  {
    name: "Administration",
    icon: <AdministrationIcon />,
    roles: [1, 2],
    subItems: [
      {
        name: "Manage Users",
        path: "/users",
        roles: [1, 2],
        hasPermission: (user) =>
          hasUserManagementPermission(user, UserManagementPermissionEnum.View),
      },
      {
        name: "Deactivated",
        path: "/deactive",
        roles: [1, 2],
        hasPermission: (user) =>
          hasUserManagementPermission(user, UserManagementPermissionEnum.Deactivate),
      },
      {
        name: "Divisions",
        path: "/divisions",
        roles: [1, 2],
        hasPermission: (user) =>
          hasUserManagementPermission(user, UserManagementPermissionEnum.View),
      },
      {
        name: "Access Control",
        path: "/access",
        roles: [1],
      },
    ],
  },

  ...SUPER_ADMIN_ROUTES,
];

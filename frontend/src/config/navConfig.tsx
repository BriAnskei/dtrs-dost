import type { Roles } from "../features/user-management/type/user.type";
import {
  AccessControlIcon,
  AdministrationIcon,
  AssignedDocumentsIcon,
  BoxCubeIcon,
  Document,
  GridIcon,
  Notification,
  PieChartIcon,
  PlugInIcon,
  SettingIcon,
  SystemLogsIcon,
  Upload,
  UserManagementIcon,
} from "../icons";

export interface NavItem {
  name: string;
  icon: React.ReactNode;
  path?: string;

  roles: Roles[];

  subItems?: (Omit<NavItem, "subItems" | "icon"> & { path: string })[];
}

// Super Admin
// Navigation Item	Sub-items
// Dashboard	–
// Documents	in, out, validation (queue) DONE
// User Management	– DONE
// Access Control	–DONE
// Notification	-DONE
// System Logs	–DONE
// Setting	–DONE

// Admin
// Navigation Item	Sub-items
// Dashboard	–
// Upload Queue	–
// Documents	in, out
// Notification	–

// Receiver
// Navigation Item	Sub-items
// Dashboard	–
// Document	upload, uploads
// Notification	–

const SUPER_ADMIN_ROUTES: NavItem[] = [
  {
    name: "System Logs",
    path: "/activities",
    icon: <SystemLogsIcon />, // consistent size/color
    roles: [1],
  },
  {
    name: "Setting",
    path: "/Seting",
    icon: <SettingIcon />, // consistent size/color
    roles: [1],
  },
];

const DIVISION_ROUTES: NavItem[] = [
  {
    name: "Assigned Documents",
    path: "division/assigned-documents",
    icon: <AssignedDocumentsIcon />,
    roles: [4],
  },
];

export const NAV_ITEMS: NavItem[] = [
  {
    name: "Dashboard",
    icon: <GridIcon />,
    path: "/",
    roles: [1, 2, 3],
  },

  {
    name: "Documents",
    icon: <Document />,
    roles: [1, 2, 3],
    subItems: [
      // Super Admin, Admin
      {
        name: "New Doc",
        path: "/upload-direct",
        roles: [1, 2],
      },
      {
        name: "Pending",
        path: "/upload-queue",
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

      {
        name: "Submit Doc",
        path: "/upload",
        roles: [3],
      },
      {
        name: "My Submissions",
        path: "/uploads",
        roles: [3],
      },
      {
        name: "Invalid Docs",
        path: "/invalid-documents",
        roles: [3],
      },
    ],
  },

  ...DIVISION_ROUTES,

  {
    name: "Notification",
    icon: <Notification />,
    path: "/notification",
    roles: [1, 2, 3, 4],
  },
];

export const OTHERS_NAV_ITEMS: NavItem[] = [
  {
    name: "Administration",
    icon: <AdministrationIcon />,
    roles: [1],
    subItems: [
      {
        name: "Manage Users",
        path: "/users",
        roles: [1],
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

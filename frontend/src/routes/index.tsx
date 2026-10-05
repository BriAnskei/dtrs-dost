import { createBrowserRouter } from "react-router";
import AccessControlPage from "../features/access-control/components/AccessControlPage";
import ResetPassword from "../features/auth/authentication/components/ResetPassword";
import SignIn from "../features/auth/authentication/components/SignIn";
import { UserManagementPermissionEnum } from "../features/auth/authorization/enum/user-management-permission";
import { hasPermission } from "../features/auth/authorization/helpers/has-permission";
import PermissionRoute from "../features/auth/authorization/PermissionRoute";
import PublicRoute from "../features/auth/authorization/PublicRoute";
import ProtectedRoute from "../features/auth/authorization/protectedRoute";
import RoleRoute from "../features/auth/authorization/RoleRoutes";
import DeactivatedUsersPage from "../features/deactivated-user-management/components/DeactivatedUsersPage";
import DivisionManagementPage from "../features/divisions/components/DivisionManagementPage";
import DirectUploadPage from "../features/documents/extraction/admins/components/DirectUploadPage";
import ReceiverUploadPage from "../features/documents/extraction/receiver/components/ReceiverUploadPage";
import UserManagementPage from "../features/user-management/components/UserManagementPage";
import AppLayout from "../layout/AppLayout";
import AdminDashboard from "../pages/Dashboard/AdminDashboard";
import ReceiverDashboard from "../pages/Dashboard/ReceiverDashboard";
import StaleDocumentsPage from "../pages/Dashboard/StaleDocumentsPage";
import SuperAdminDashboard from "../pages/Dashboard/SuperAdminDashboard";
import AssignedDocumentPage from "../pages/Division/AssignedDocumentPage";
import IncomingDocPage from "../pages/document/IncomingDocPage";
import InvalidDocumentPage from "../pages/document/InvalidDocumentPage";
import InvalidDocumentsPage from "../pages/document/InvalidDocumentsPage";
import OutgoingDocPage from "../pages/document/OutgoingDocPage";
import UploadedIncomingDocPage from "../pages/document/UploadedIncomingDocPage";
import ValudationQueue from "../pages/document/UploadQueue";
import SystemLogsPage from "../pages/Logs/SystemLogsPage";
import NotificationPage from "../pages/notification/NotificationPage";
import NotFound from "../pages/OtherPage/NotFound";
import Unauthorized from "../pages/OtherPage/Unauthorized";
import PublicTrackingPage from "../pages/Public/PublicTrackingPage";
import { DashboardRedirect, UploadRedirect } from "./Redirect";

type RouteType = {
  path: string;
  element: React.JSX.Element;
};

const GLOBAL_ROUTES: RouteType[] = [
  {
    path: "/notification",
    element: <NotificationPage />,
  },
  {
    path: "/upload",
    element: <UploadRedirect />,
  },
];

const ADMINISTRATION_ROUTES: RouteType[] = [
  {
    path: "/incoming",
    element: (
      <RoleRoute allowedRoles={[1, 2]}>
        <IncomingDocPage />
      </RoleRoute>
    ),
  },

  {
    path: "/outgoing",
    element: (
      <RoleRoute allowedRoles={[1, 2]}>
        <OutgoingDocPage />
      </RoleRoute>
    ),
  },

  // Upload Routes
  {
    path: "/upload-direct",
    element: (
      <RoleRoute allowedRoles={[1, 2]}>
        <DirectUploadPage />
      </RoleRoute>
    ),
  },

  {
    path: "/upload-queue",
    element: (
      <RoleRoute allowedRoles={[1, 2]}>
        <ValudationQueue />
      </RoleRoute>
    ),
  },

  {
    path: "/upload-invalid",
    element: (
      <RoleRoute allowedRoles={[1, 2]}>
        <InvalidDocumentsPage />
      </RoleRoute>
    ),
  },
];

const SUPER_ADMIN_ROUTES: RouteType[] = [
  {
    path: "/super-admin/dashboard",
    element: (
      <RoleRoute allowedRoles={[1]}>
        <SuperAdminDashboard />
      </RoleRoute>
    ),
  },
  {
    path: "/users",
    element: (
      <PermissionRoute
        hasPermission={(user) =>
          hasPermission(
            user.permissions.user_management_permissions,
            UserManagementPermissionEnum.View,
          )
        }
      >
        <UserManagementPage />
      </PermissionRoute>
    ),
  },
  {
    path: "/divisions",
    element: (
      <PermissionRoute
        hasPermission={(user) =>
          hasPermission(
            user.permissions.user_management_permissions,
            UserManagementPermissionEnum.View,
          )
        }
      >
        <DivisionManagementPage />
      </PermissionRoute>
    ),
  },

  {
    path: "/deactive",
    element: (
      <PermissionRoute
        hasPermission={(user) =>
          hasPermission(
            user.permissions.user_management_permissions,
            UserManagementPermissionEnum.Deactivate,
          )
        }
      >
        <DeactivatedUsersPage />
      </PermissionRoute>
    ),
  },

  {
    path: "/access",
    element: (
      <RoleRoute allowedRoles={[1]}>
        <AccessControlPage />
      </RoleRoute>
    ),
  },
  {
    path: "/activities",
    element: (
      <RoleRoute allowedRoles={[1]}>
        <SystemLogsPage />
      </RoleRoute>
    ),
  },
  {
    path: "/setting",
    element: (
      <RoleRoute allowedRoles={[1]}>
        <>System Configuration</>
      </RoleRoute>
    ),
  },
];

const ADMIN_ROUTES: RouteType[] = [
  {
    path: "/admin/dashboard",
    element: (
      <RoleRoute allowedRoles={[2]}>
        <AdminDashboard />
      </RoleRoute>
    ),
  },
  {
    path: "/admin/stale-documents",
    element: (
      <RoleRoute allowedRoles={[2]}>
        <StaleDocumentsPage />
      </RoleRoute>
    ),
  },
];

const RECEIVING_OFFICER_ROUTES: RouteType[] = [
  {
    path: "/receiving-officer/dashboard",
    element: <ReceiverDashboard />,
  },
  {
    path: "/incoming-upload",
    element: <ReceiverUploadPage />,
  },
  {
    path: "/uploads",
    element: <UploadedIncomingDocPage />,
  },
  {
    path: "/invalid-documents",
    element: <InvalidDocumentPage />,
  },
];

const DIVISION_ROUTE: RouteType[] = [
  {
    path: "/division/assigned-documents",
    element: <AssignedDocumentPage />,
  },
];

export const router = createBrowserRouter([
  {
    path: "/signin",
    element: (
      <PublicRoute>
        <SignIn />
      </PublicRoute>
    ),
  },

  {
    path: "/reset-password/:token",
    element: (
      <PublicRoute>
        <ResetPassword />
      </PublicRoute>
    ),
  },

  {
    path: "/document/track",
    element: <PublicTrackingPage />,
  },

  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      ...GLOBAL_ROUTES,
      ...ADMINISTRATION_ROUTES,
      ...SUPER_ADMIN_ROUTES,
      ...ADMIN_ROUTES,
      ...RECEIVING_OFFICER_ROUTES,
      ...DIVISION_ROUTE,
      {
        path: "/",
        element: <DashboardRedirect />,
      },
    ],
  },

  {
    path: "/unauthorized",
    element: <Unauthorized />,
  },

  {
    path: "*",
    element: <NotFound />,
  },
]);

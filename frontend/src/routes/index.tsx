import { createBrowserRouter } from "react-router";
import UserManagementTable from "../components/tables/Administration/UserManagementTable";
import SignIn from "../features/authentication/components/SignIn";
import AppLayout from "../layout/AppLayout";
import AccessControlPage from "../pages/Administration/AcessControlPage";
import UserManagementPage from "../pages/Administration/UserManagementPage";
import AdminDashboard from "../pages/Dashboard/AdminDashboard";
import Home from "../pages/Dashboard/Home";
import ReceiverDashboard from "../pages/Dashboard/ReceiverDashboard";
import StaleDocumentsPage from "../pages/Dashboard/StaleDocumentsPage";
import SuperAdminDashboard from "../pages/Dashboard/SuperAdminDashboard";
import AssignedDocumentPage from "../pages/Division/AssignedDocumentPage";
import DocumentUploadPage from "../pages/document/DocumentUploadPage";
import IncomingDocPage from "../pages/document/IncomingDocPage";
import IncomingDocumentUploadPage from "../pages/document/IncomingDocumentUploadPage";
import InvalidDocumentPage from "../pages/document/InvalidDocumentPage";
import InvalidDocumentsPage from "../pages/document/InvalidDocumentsPage";
import OutgoingDocPage from "../pages/document/OutgoingDocPage";
import UploadedIncomingDoc from "../pages/document/UploadedIncomingDocPage";
import UploadedIncomingDocPage from "../pages/document/UploadedIncomingDocPage";
import ValudationQueue from "../pages/document/UploadQueue";
import SystemLogsPage from "../pages/Logs/SystemLogsPage";
import NotificationPage from "../pages/notification/NotificationPage";
import NotFound from "../pages/OtherPage/NotFound";
import Unauthorized from "../pages/OtherPage/Unauthorized";
import PublicTrackingPage from "../pages/Public/PublicTrackingPage";
import ProtectedRoute from "./protectedRoute";
import { DashboardRedirect, UploadRedirect } from "./Redirect";
import RoleRoute from "./RoleRoutes";

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
        <DocumentUploadPage />
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
      <RoleRoute allowedRoles={[1]}>
        <UserManagementPage />
      </RoleRoute>
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
    element: <IncomingDocumentUploadPage />,
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
    element: <SignIn />,
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

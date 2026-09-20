import { Navigate } from "react-router";
import type { Roles } from "../context/currentUser/curr-user.type";
import { useUser } from "../context/currentUser/use-user";

function createRolePath(paths: {
  superAdmin?: string;
  admin?: string;
  receiving_officer?: string;
  division?: string;
}): Partial<Record<Roles, string>> {
  return {
    ...(paths.superAdmin && { 1: `/super-admin//${paths.superAdmin}` }),
    ...(paths.admin && { 2: `/admin/${paths.admin}` }),
    ...(paths.receiving_officer && {
      3: `/receiving-officer/${paths.receiving_officer}`,
    }),
    ...(paths.division && { 4: `/division/${paths.division}` }),
  };
}

export function DashboardRedirect() {
  const { currentUser } = useUser();

  if (!currentUser) return <Navigate to="/signin" />;

  const role = currentUser.role_id;

  const dashboardPath = createRolePath({
    superAdmin: "dashboard",
    admin: "dashboard",
    receiving_officer: "dashboard",
    division: "assigned-documents", // no dashboard
  })[role];

  if (!dashboardPath) return <Navigate to="notFound" />;

  return <Navigate to={dashboardPath} />;
}

export function UploadRedirect() {
  // if (!role) return <Navigate to="/signin" />;
  //
  // if ([1, 2].includes(role)) return <Navigate to="/upload-direct" />;
  //
  // return <Navigate to="/incoming-upload" />;

  return <Navigate to="/upload-direct" />;
}

import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import UserManagementTable from "./UserManagementTable";

export default function UserManagementPage() {

  return (
    <>
      <PageMeta
        title="User Management | Document Tracking System"
        description="Manage system user accounts — add admins, update details, and control access."
      />
      <PageBreadcrumb pageTitle="User Management" />
      <div className="space-y-6">
        <ComponentCard>
          <UserManagementTable />
        </ComponentCard>
      </div>
    </>
  );
}

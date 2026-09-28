import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import UserManagementAccessTable from "./UserManagementAccessTable";

export default function AccessControlPage() {
  return (
    <>
      <PageMeta
        title="Access Control | Document Tracking System"
        description="Grant admins access to User Management and control which functions they can perform."
      />
      <PageBreadcrumb pageTitle="Access Control" />
      <div className="space-y-6">
        <ComponentCard>
          <UserManagementAccessTable />
        </ComponentCard>
      </div>
    </>
  );
}

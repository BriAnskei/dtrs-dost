import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import DeactivatedUserTable from "./DeactivatedUsersTable";

export default function DeactivatedUsersPage() {
  return (
    <>
      <PageMeta
        title="Deactivated Users | Document Tracking System"
        description="View, reactivate, or permanently delete deactivated user accounts."
      />
      <PageBreadcrumb pageTitle="Deactivated Users" />
      <div className="space-y-6">
        <ComponentCard>
          <DeactivatedUserTable />
        </ComponentCard>
      </div>
    </>
  );
}

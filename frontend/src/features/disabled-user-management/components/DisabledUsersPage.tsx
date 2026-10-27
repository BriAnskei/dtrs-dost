import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import DisabledUserTable from "./DisabledUsersTable";

export default function DisabledUsersPage() {
  return (
    <>
      <PageMeta
        title="Disabled Users | Document Tracking System"
        description="View, reactivate, or permanently delete disabled user accounts."
      />
      <PageBreadcrumb pageTitle="Disabled Users" />
      <div className="space-y-6">
        <ComponentCard>
          <DisabledUserTable />
        </ComponentCard>
      </div>
    </>
  );
}

import ComponentCard from "../../../components/common/ComponentCard";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import DivisionManagementTable from "./DivisionManagementTable";

export default function DivisionManagementPage() {
  return (
    <>
      <PageMeta
        title="Division Records | Document Tracking System"
        description="Manage divisions and see which users belong to each."
      />
      <PageBreadcrumb pageTitle="Division Records" />
      <div className="space-y-6">
        <ComponentCard>
          <DivisionManagementTable />
        </ComponentCard>
      </div>
    </>
  );
}

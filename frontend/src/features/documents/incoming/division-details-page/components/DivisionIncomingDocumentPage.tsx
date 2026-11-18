import PageMeta from "../../../../../components/common/PageMeta";
import DetailsPageHeader from "../../detials-page/components/DetialsPageHeader";
import DetailsPageSkeleton from "../../detials-page/components/DetialsPageSkeleton";
import { panelDomId, tabDomId } from "../../detials-page/constant";
import ChangeStatusModal from "../../shared/component/modal/ChangeStatusModal";
import StatusHistoryTab from "../../shared/status-history/components/StatusHistoryTab";
import DivisionAssignmentsTab from "../assignment/components/DivisionAssignmentTab";
import { DIVISION_BACK_PATH } from "../contants";
import { useDivisionIncomingDocumentDetailsPage } from "../hooks/use-division-incoming-document-details-page";
import DivisionOverviewTab from "../overview/components/DivisionOverviewTab";
import DivisionDetailsErrorState from "./DivisionDetailsErrorState";
import DivisionDetailsTabs from "./DivisionDetailsTabs";

export default function DivisionIncomingDocumentDetailsPage() {
  const { tab, setTab, doc, trackingNo, isLoading, retry, progress, file, statusModal } =
    useDivisionIncomingDocumentDetailsPage();

  return (
    <>
      <PageMeta
        title={`${trackingNo ?? "Document Details"} | Document Tracking System`}
        description="Incoming document details for your division — overview, assignments, and status history."
      />

      <div className="space-y-4">
        {isLoading ? (
          <DetailsPageSkeleton />
        ) : !doc ? (
          // Keyed on `doc`, not `isError`: a failed background refetch keeps the
          // cached document on screen instead of unmounting the page and modal.
          <DivisionDetailsErrorState onRetry={retry} />
        ) : (
          <>
            <div className="space-y-2">
              <DetailsPageHeader
                trackingNo={trackingNo ?? ""}
                subject={doc.subject}
                status={doc.status}
                backPath={DIVISION_BACK_PATH}
                onChangeStatus={statusModal.open}
              />
              <DivisionDetailsTabs activeTab={tab} onChange={setTab} />
            </div>
            <div
              role="tabpanel"
              id={panelDomId(tab)}
              aria-labelledby={tabDomId(tab)}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: accessible tab interface using the WAI-ARIA tab pattern.
              tabIndex={0}
              className="focus:outline-none"
            >
              {tab === "overview" ? (
                <DivisionOverviewTab doc={doc} progress={progress} file={file} />
              ) : tab === "assignments" ? (
                <DivisionAssignmentsTab incomingDocumentId={doc.id} />
              ) : (
                <StatusHistoryTab incomingDocumentId={doc.id} />
              )}
            </div>

            {/* Mounted only while open so the form state resets on every open. */}
            {statusModal.isOpen && (
              <ChangeStatusModal
                incomingDocumentId={doc.id}
                trackingNo={trackingNo ?? ""}
                currentStatus={doc.status}
                onClose={statusModal.close}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

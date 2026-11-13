import PageMeta from "../../../../../components/common/PageMeta";
import DetailsPageHeader from "../../detials-page/components/DetialsPageHeader";
import DetailsPageSkeleton from "../../detials-page/components/DetialsPageSkeleton";
import TabPlaceholder from "../../detials-page/components/TabPlaceHolder";
import { panelDomId, tabDomId } from "../../detials-page/constant";
import DivisionAssignmentsTab from "../assignment/components/DivisionAssignmentTab";
import { DIVISION_BACK_PATH } from "../contants";
import {
  DIVISION_DETAIL_TABS,
  useDivisionIncomingDocumentDetailsPage,
} from "../hooks/use-division-incoming-document-details-page";
import DivisionOverviewTab from "../overview/components/DivisionOverviewTab";
import DivisionDetailsErrorState from "./DivisionDetailsErrorState";
import DivisionDetailsTabs from "./DivisionDetailsTabs";

export default function DivisionIncomingDocumentDetailsPage() {
  const { tab, setTab, doc, trackingNo, isLoading, isError, retry, progress, file } =
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
        ) : isError || !doc ? (
          <DivisionDetailsErrorState onRetry={retry} />
        ) : (
          <>
            <div className="space-y-2">
              <DetailsPageHeader
                trackingNo={trackingNo ?? ""}
                subject={doc.subject}
                status={doc.status}
                backPath={DIVISION_BACK_PATH}
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
                <TabPlaceholder
                  label={DIVISION_DETAIL_TABS.find((t) => t.id === tab)?.label ?? ""}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

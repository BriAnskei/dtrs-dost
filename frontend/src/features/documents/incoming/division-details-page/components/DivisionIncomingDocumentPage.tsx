import PageMeta from "../../../../../components/common/PageMeta";
import DetailsPageSkeleton from "../../detials-page/components/DetialsPageSkeleton";
import TabPlaceholder from "../../detials-page/components/TabPlaceHolder";
import { panelDomId, tabDomId } from "../../detials-page/constant";
import {
  DIVISION_DETAIL_TABS,
  useDivisionIncomingDocumentDetailsPage,
} from "../hooks/use-division-incoming-document-details-page";
import DivisionOverviewTab from "../overview/DivisionOverviewTab";
import DivisionDetailsErrorState from "./DivisionDetailsErrorState";
import DivisionDetailsPageHeader from "./DivisionDetailsHeader";
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
              <DivisionDetailsPageHeader
                trackingNo={trackingNo ?? null}
                subject={doc.subject}
              />
              <DivisionDetailsTabs activeTab={tab} onChange={setTab} />
            </div>
            <div
              role="tabpanel"
              id={panelDomId(tab)}
              aria-labelledby={tabDomId(tab)}
              tabIndex={0}
              className="focus:outline-none"
            >
              {tab === "overview" ? (
                <DivisionOverviewTab doc={doc} progress={progress} file={file} />
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

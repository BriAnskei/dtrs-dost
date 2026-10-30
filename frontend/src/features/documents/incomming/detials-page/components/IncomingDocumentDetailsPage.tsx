import PageMeta from "../../../../../components/common/PageMeta";
import { panelDomId, tabDomId } from "../constant";
import {
  DETAIL_TABS,
  useIncomingDocumentDetailsPage,
} from "../hooks/use-incoming-document-details-page";
import DetailsErrorState from "./DetialsErrorState";
import DetailsPageHeader from "./DetialsPageHeader";
import DetailsPageSkeleton from "./DetialsPageSkeleton";
import DetailsTabs from "./DetialsTabs";

import TabPlaceholder from "./TabPlaceHolder";
import OverviewTab from "./tabs/overview/OverviewTab";
import RoutedDivisionsTab from "./tabs/routed-division/RoutedDivisionsTab";

export default function IncomingDocumentDetailsPage() {
  const {
    tab,
    setTab,
    doc,
    trackingNo,
    isLoading,
    isError,
    retry,
    progress,
    file,
    divisions,
  } = useIncomingDocumentDetailsPage();

  return (
    <>
      <PageMeta
        title={`${trackingNo ?? "Document Details"} | Document Tracking System`}
        description="Incoming document details — overview, routing, actions, and status history."
      />

      <div className="space-y-4">
        {isLoading ? (
          <DetailsPageSkeleton />
        ) : isError || !doc ? (
          <DetailsErrorState onRetry={retry} />
        ) : (
          <>
            <div className="space-y-2">
              <DetailsPageHeader
                trackingNo={trackingNo ?? doc.tracking_sequence}
                subject={doc.subject}
                status={doc.status}
              />
              <DetailsTabs activeTab={tab} onChange={setTab} />
            </div>
            <div role="tabpanel" id={panelDomId(tab)} aria-labelledby={tabDomId(tab)}>
              {tab === "overview" ? (
                <OverviewTab doc={doc} progress={progress} file={file} />
              ) : tab === "routed-divisions" ? (
                <RoutedDivisionsTab doc={doc} divisions={divisions} />
              ) : (
                <TabPlaceholder
                  label={DETAIL_TABS.find((t) => t.id === tab)?.label ?? ""}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

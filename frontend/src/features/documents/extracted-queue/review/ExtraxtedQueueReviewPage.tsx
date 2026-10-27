import { useParams } from "react-router";
import ComponentCard from "../../../../components/common/ComponentCard";
import PageMeta from "../../../../components/common/PageMeta";
import ExtractedQueueReviewContent from "./components/ExtractedQueueReviewContent";

export default function ExtractedQueueReviewPage() {
  const { id = "" } = useParams();

  return (
    <>
      <PageMeta
        title="Review Extraction | Document Tracking System"
        description="Check the extracted fields against the uploaded document."
      />
      <div className="space-y-6">
        <ComponentCard>
          {/* key resets the edits if the route param changes */}
          <ExtractedQueueReviewContent key={id} id={id} />
        </ComponentCard>
      </div>
    </>
  );
}

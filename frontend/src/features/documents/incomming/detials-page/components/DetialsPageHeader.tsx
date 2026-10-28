import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import StatusBadge, {
  INCOMING_STATUS_BADGE,
} from "../../../../../components/ui/badge/StatusBadge";
import type { IncomingDocumentStatus } from "../../types/incoming-document.type";
import { BACK_PATH, backLinkClass } from "../constant";

interface DetailsPageHeaderProps {
  trackingNo: string;
  subject: string;
  status: IncomingDocumentStatus;
}

export default function DetailsPageHeader({
  trackingNo,
  subject,
  status,
}: DetailsPageHeaderProps) {
  return (
    <header className="space-y-3">
      <Link to={BACK_PATH} className={backLinkClass}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to incoming documents
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <p className="break-all font-mono text-base font-semibold tracking-wide text-primary dark:text-secondary sm:text-lg">
          {trackingNo}
        </p>

        <StatusBadge config={INCOMING_STATUS_BADGE[status]} />
      </div>

      <h1 className="text-2xl font-semibold leading-snug text-gray-800 wrap-break-word dark:text-white/90">
        {subject}
      </h1>
    </header>
  );
}

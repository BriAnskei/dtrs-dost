import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import StatusBadge, {
  INCOMING_STATUS_BADGE,
} from "../../../../../components/ui/badge/StatusBadge";
import { secondaryButton } from "../../shared/detial-panel-form-style-constant";
import type { IncomingDocumentStatus } from "../../types/incoming-document.type";
import { BACK_PATH, backLinkClass } from "../constant";

interface DetailsPageHeaderProps {
  trackingNo: string;
  subject: string;
  status: IncomingDocumentStatus;
  backPath?: string;
  backLabel?: string;
  /** When provided, a "Change status" button is shown next to the badge. */
  onChangeStatus?: () => void;
}

export default function DetailsPageHeader({
  trackingNo,
  subject,
  status,
  backPath = BACK_PATH,
  backLabel = "Back to incoming documents",
  onChangeStatus,
}: DetailsPageHeaderProps) {
  return (
    <header className="space-y-3">
      <Link to={backPath} className={backLinkClass}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <p className="break-all font-mono text-base font-semibold tracking-wide text-primary dark:text-secondary sm:text-lg">
          {trackingNo}
        </p>

        <StatusBadge config={INCOMING_STATUS_BADGE[status]} />

        {onChangeStatus && (
          <button type="button" onClick={onChangeStatus} className={secondaryButton}>
            Change status
          </button>
        )}
      </div>

      <h1 className="text-2xl font-semibold leading-snug text-gray-800 wrap-break-word dark:text-white/90">
        {subject}
      </h1>
    </header>
  );
}

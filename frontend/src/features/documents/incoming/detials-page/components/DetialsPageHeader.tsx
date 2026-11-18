import { ArrowLeft, Pencil } from "lucide-react";
import { Link } from "react-router";
import StatusBadge, {
  INCOMING_STATUS_BADGE,
} from "../../../../../components/ui/badge/StatusBadge";
import { STATUS_LABEL } from "../../shared/hooks/use-change-status-modal";
import type { IncomingDocumentStatus } from "../../types/incoming-document.type";
import { BACK_PATH, backLinkClass } from "../constant";

interface DetailsPageHeaderProps {
  trackingNo: string;
  subject: string;
  status: IncomingDocumentStatus;
  backPath?: string;
  backLabel?: string;
  /**
   * When provided, the status badge becomes a button that calls this
   * (it opens the change-status modal). Omit it for a read-only badge.
   */
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
  const badge = <StatusBadge config={INCOMING_STATUS_BADGE[status]} />;

  return (
    <header className="space-y-3">
      <Link to={backPath} className={backLinkClass}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <p className="break-all font-mono text-theme-sm font-semibold tracking-wide text-primary dark:text-secondary sm:text-theme-base">
          {trackingNo}
        </p>

        {onChangeStatus ? (
          // The status text is the control: badge + pencil icon, one button.
          // The negative margin grows the tap target without moving the layout.
          <button
            type="button"
            onClick={onChangeStatus}
            aria-haspopup="dialog"
            aria-label={`Change status. Current status: ${STATUS_LABEL[status]}`}
            title="Change status"
            className="group -m-1 inline-flex items-center gap-1.5 rounded-full p-1 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 dark:hover:bg-white/5"
          >
            {badge}
            <Pencil
              className="h-3.5 w-3.5 text-gray-400 transition group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
              aria-hidden="true"
            />
          </button>
        ) : (
          badge
        )}
      </div>

      <h1 className="text-2xl font-semibold leading-snug text-gray-800 wrap-break-word dark:text-white/90">
        {subject}
      </h1>
    </header>
  );
}

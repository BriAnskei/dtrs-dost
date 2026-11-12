import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { backLinkClass } from "../../detials-page/constant";
import { DIVISION_BACK_PATH } from "../contants";

interface DivisionDetailsPageHeaderProps {
  trackingNo: string | null;
  subject: string;
}

export default function DivisionDetailsPageHeader({
  trackingNo,
  subject,
}: DivisionDetailsPageHeaderProps) {
  return (
    <header className="space-y-3">
      <Link to={DIVISION_BACK_PATH} className={backLinkClass}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to incoming documents
      </Link>

      {trackingNo && (
        <p className="break-all font-mono text-base font-semibold tracking-wide text-primary dark:text-secondary sm:text-lg">
          {trackingNo}
        </p>
      )}

      <h1 className="text-2xl font-semibold leading-snug text-gray-800 wrap-break-word dark:text-white/90">
        {subject}
      </h1>
    </header>
  );
}

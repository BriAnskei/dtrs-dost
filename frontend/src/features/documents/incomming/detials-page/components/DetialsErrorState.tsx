import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { BACK_PATH, backLinkClass, cardClass } from "../constant";

interface DetailsErrorStateProps {
  onRetry: () => void;
}

export default function DetailsErrorState({ onRetry }: DetailsErrorStateProps) {
  return (
    <div className={`${cardClass} space-y-3 text-center`} role="alert">
      <p className="text-theme-sm text-gray-600 dark:text-gray-300">
        Couldn't load this document. It may have been removed, or the connection failed.
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onRetry}
          className="rounded text-theme-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
        >
          Retry
        </button>
        <Link to={BACK_PATH} className={backLinkClass}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to incoming documents
        </Link>
      </div>
    </div>
  );
}

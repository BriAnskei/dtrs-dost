import UploadCheckIcon from "./UploadCheckIcon";

interface Props {
  fileName: string;
  /** Pass only when extraction results exist; otherwise no button is shown. */
  onViewResults?: () => void;
}

const viewBtn =
  "mt-1 inline-flex items-center gap-1.5 rounded-lg border border-success-200 bg-white px-3 py-1.5 text-theme-sm font-medium text-gray-700 transition hover:border-success-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-500/40 dark:border-success-500/30 dark:bg-white/3 dark:text-gray-200";

export default function UploadSuccessCard({ fileName, onViewResults }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-10 text-center dark:border-success-500/30 dark:bg-success-500/10">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-500 text-white">
        <UploadCheckIcon />
      </span>
      <p className="text-theme-md font-semibold text-gray-800 dark:text-white/90">
        Document uploaded
      </p>
      <p className="max-w-sm break-words text-theme-sm text-gray-600 dark:text-gray-300">
        <span className="font-medium">{fileName}</span> has been uploaded and is waiting
        for validation. It will appear in Incoming Documents once an admin approves it.
      </p>

      {onViewResults && (
        <button type="button" className={viewBtn} onClick={onViewResults}>
          View extraction results
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M7.5 5l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

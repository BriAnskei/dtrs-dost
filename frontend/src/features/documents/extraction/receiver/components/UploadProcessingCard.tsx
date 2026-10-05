import UploadProgressList from "./UploadProgressList";

interface Props {
  fileName: string;
  activeIdx: number;
  /** Extraction finished but sending to the queue failed. */
  failed: boolean;
}

export default function UploadProcessingCard({ fileName, activeIdx, failed }: Props) {
  return (
    <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-white/8 dark:bg-white/3">
      <div className="min-w-0">
        <p className="truncate text-theme-sm font-medium text-gray-800 dark:text-white/90">
          {fileName}
        </p>
        <p className="text-theme-xs text-gray-400 dark:text-gray-500">
          {failed
            ? "Processing finished, but sending failed."
            : "Please keep this tab open until it finishes."}
        </p>
      </div>
      <UploadProgressList activeIdx={activeIdx} failed={failed} />
    </div>
  );
}

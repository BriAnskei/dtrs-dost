import UploadCheckIcon from "./UploadCheckIcon";

export default function UploadSuccessCard({ fileName }: { fileName: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-10 text-center dark:border-success-500/30 dark:bg-success-500/10">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-success-500 text-white">
        <UploadCheckIcon />
      </span>
      <p className="text-theme-md font-semibold text-gray-800 dark:text-white/90">
        Sent for validation
      </p>
      <p className="max-w-sm break-words text-theme-sm text-gray-600 dark:text-gray-300">
        <span className="font-medium">{fileName}</span> is in the queue. It will appear in
        Incoming Documents once an admin approves it.
      </p>
    </div>
  );
}

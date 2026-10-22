type ReviewDocumentHeaderProps = {
  fileName: string;
  uploaderName?: string | null;
};

export default function ReviewDocumentHeader({
  fileName,
  uploaderName,
}: ReviewDocumentHeaderProps) {
  return (
    <div className="flex min-w-0 items-baseline justify-end gap-2">
      <h3
        title={fileName}
        className="truncate text-theme-xl font-semibold text-gray-800 dark:text-white/90"
      >
        {fileName}
      </h3>
      <span aria-hidden className="text-gray-300 dark:text-white/20">
        •
      </span>
      <p className="shrink-0 whitespace-nowrap text-theme-sm text-gray-500 dark:text-gray-400">
        Uploaded by {uploaderName ?? "Unknown uploader"}
      </p>
    </div>
  );
}

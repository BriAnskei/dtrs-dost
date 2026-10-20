type ReviewDocumentHeaderProps = {
  fileName: string;
  uploaderName?: string | null;
};

export default function ReviewDocumentHeader({
  fileName,
  uploaderName,
}: ReviewDocumentHeaderProps) {
  return (
    <div className="min-w-0">
      <h3 className="truncate text-theme-xl font-semibold text-gray-800 dark:text-white/90">
        {fileName}
      </h3>
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Uploaded by {uploaderName ?? "Unknown uploader"}
      </p>
    </div>
  );
}

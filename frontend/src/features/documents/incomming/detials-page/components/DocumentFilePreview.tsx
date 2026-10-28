import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import FilePreview from "../../../../../components/FilePreview";
import { SKELETON_BASE, SKELETON_HIGHLIGHT } from "../constant";

export interface DocumentFileState {
  blob: Blob | undefined;
  isLoading: boolean;
  isError: boolean;
  retry: () => void;
}

interface DocumentFilePreviewProps {
  file: DocumentFileState;
  fileName: string;
}

export default function DocumentFilePreview({
  file,
  fileName,
}: DocumentFilePreviewProps) {
  return (
    <div className="min-w-0 self-start">
      {file.isLoading ? (
        <SkeletonTheme baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT}>
          <div role="status" aria-busy="true" aria-label="Loading document file">
            <Skeleton height={384} borderRadius={8} />
          </div>
        </SkeletonTheme>
      ) : (
        <FilePreview
          blob={file.blob}
          fileName={fileName}
          isLoading={false}
          isError={file.isError}
          onRetry={file.retry}
          maxHeightClassName="max-h-[70vh]"
        />
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { DocumentFileService } from "../../../document-files.service";
import { toOutcome } from "../../helpers/to-outcome";
import { ExtractedQueueService } from "../../service/extracted-queue.service";

export function useExtractedQueueDetail(id: string) {
  const detailQuery = useQuery({
    queryKey: ["extracted-document-queue", id],
    queryFn: () => ExtractedQueueService.findOne(id),
    enabled: !!id,
  });

  const fileQuery = useQuery({
    queryKey: ["extracted-document-queue", id, "file"],
    queryFn: () => DocumentFileService.getFile(id),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const detail = detailQuery.data;
  const blob = fileQuery.data;
  const fileName = detail?.file_name;

  // PdfViewer reloads whenever `file` changes identity, so keep it stable.
  const file = useMemo(
    () =>
      blob && fileName ? new File([blob], fileName, { type: "application/pdf" }) : null,
    [blob, fileName],
  );

  const outcome = useMemo(() => (detail ? toOutcome(detail) : null), [detail]);

  return {
    detail,
    file,
    outcome,
    isLoading: detailQuery.isLoading || fileQuery.isLoading,
    isError: detailQuery.isError || fileQuery.isError,
  };
}

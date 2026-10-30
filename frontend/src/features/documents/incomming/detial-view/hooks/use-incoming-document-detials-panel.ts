import { useState } from "react";
import { useNavigate } from "react-router";
import { useAssignedDivisionNoticeCounts } from "../../shared-api-hooks/use-assigned-division-notice-count";
import { useIncomingDocumentFile } from "../../shared-api-hooks/use-incoming-document-file";
import type { IncomingDocumentRow } from "../../types/incoming-document-row.type";

interface Options {
  /** The selected row, or `null` when nothing is selected (panel closed). */
  row: IncomingDocumentRow | null;
  onClose: () => void;
}

export function useIncomingDocumentDetailPanel({ row, onClose }: Options) {
  const navigate = useNavigate();

  // Remember the last selected row so the content doesn't blank out
  // while the panel is sliding closed.
  const [lastRow, setLastRow] = useState(row);
  if (row && row !== lastRow) setLastRow(row);

  const doc = row ?? lastRow;
  const isOpen = row !== null;

  // Only fetch once the panel is actually open.
  const fileQuery = useIncomingDocumentFile({ id: doc?.id, enabled: isOpen });
  const divisionsQuery = useAssignedDivisionNoticeCounts(doc?.id, isOpen);

  const divisionItems = divisionsQuery.data ?? [];

  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const onAssignDivisions = () => setIsAssignOpen(true);
  const onCloseAssign = () => setIsAssignOpen(false);

  const onViewFullDetails = () => {
    if (!doc) return;
    onClose();
    navigate(`/incoming/${doc.id}`);
  };

  return {
    doc,
    isOpen,
    onClose,
    file: {
      blob: fileQuery.data,
      isLoading: fileQuery.isLoading,
      isError: fileQuery.isError,
      retry: () => fileQuery.refetch(),
    },
    divisions: {
      items: divisionItems,
      isLoading: divisionsQuery.isLoading,
      isError: divisionsQuery.isError,
      isEmpty:
        !divisionsQuery.isLoading &&
        !divisionsQuery.isError &&
        divisionItems.length === 0,
      retry: () => divisionsQuery.refetch(),
    },
    onViewFullDetails,

    onAssignDivisions,
    isAssignOpen,
    onCloseAssign,
  };
}

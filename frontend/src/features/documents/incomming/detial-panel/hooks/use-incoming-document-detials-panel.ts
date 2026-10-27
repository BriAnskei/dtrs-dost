// ../hooks/use-incoming-document-detail-panel.ts
import { useState } from "react";
import type { IncomingDocumentRow } from "../../types/incoming-document-row.type";
import { useAssignedDivisionNoticeCounts } from "./api/use-assigned-division-notice-count";
import { useIncomingDocumentFile } from "./api/use-incoming-document-file";

interface Options {
  /** The selected row, or `null` when nothing is selected (panel closed). */
  row: IncomingDocumentRow | null;
  onClose: () => void;
}

export function useIncomingDocumentDetailPanel({ row, onClose }: Options) {
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
    // TODO: navigate to the full incoming-document page for `doc.id`,
    // then close this panel (onClose) so it doesn't linger after navigation.
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

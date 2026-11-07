import { useCallback, useEffect, useRef, useState } from "react";
import { OfficeTypeEnum } from "../../../enum/office-type.enum";
import { useCreateIncomingDocumentAssignments } from "../../../shared/hooks/api/use-create-incoming-document-assignments";
import { useNoticeDrafts } from "../../../shared/hooks/use-notice-drafts";
import type { CreateIncomingDocumentAssignmentsDto } from "../../../types/create-incoming-document-assignments-dto";
import type { RoutedDivisionOption } from "./user-routed-division-search";

interface UseAddAssignmentModalArgs {
  incomingDocumentId: string;
  onClose: () => void;
}

/**
 * State for the "Add notice of action" modal on the Assignments tab.
 *
 * Flow: pick a target (Main office | Division) -> for Division, pick one of the
 * divisions this document is routed to -> write the notices -> save.
 * The DTO is built here so the business rule lives in one place:
 * MAIN never carries a routing id, DIVISION always does.
 *
 * Mount the modal only while it's open; closing unmounts it and drops all state.
 */
export function useAddAssignmentModal({
  incomingDocumentId,
  onClose,
}: UseAddAssignmentModalArgs) {
  const [officeType, setOfficeType] = useState<OfficeTypeEnum | null>(null);
  const [division, setDivision] = useState<RoutedDivisionOption | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [discardPrompt, setDiscardPrompt] = useState(false);

  const drafts = useNoticeDrafts();
  const { mutateAsync: createAssignments, isPending } =
    useCreateIncomingDocumentAssignments();

  /* ------------------------- routed division search ---------------------- */

  // DivisionCombobox owns the text and runs `useRoutedDivisionSearch` itself.
  // It's only mounted while Division is selected, so nothing is fetched for MAIN.

  const isDivision = officeType === OfficeTypeEnum.DIVISION;

  /* ------------------------------- target -------------------------------- */

  const isTargetReady =
    officeType === OfficeTypeEnum.MAIN || (isDivision && division !== null);

  const selectOffice = useCallback((next: OfficeTypeEnum) => {
    setOfficeType(next);
    if (next === OfficeTypeEnum.MAIN) {
      // Business rule: a main office assignment has no division.
      setDivision(null);
    }
  }, []);

  /** Fires with the division on pick, and with null as soon as the text is edited. */
  const selectDivision = useCallback((next: RoutedDivisionOption | null) => {
    setDivision(next);
  }, []);

  /* ------------------------------- drafts -------------------------------- */

  // Start with one empty notice as soon as the target is settled, so the user
  // lands in the first field. Done once; removing every notice later is allowed.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !isTargetReady) return;
    seeded.current = true;
    if (drafts.notices.length === 0) drafts.add();
  }, [isTargetReady, drafts]);

  // Keep showing typed notices even if the target is cleared again.
  const showEditor = isTargetReady || drafts.notices.length > 0;

  /* ------------------------------ validation ----------------------------- */

  const officeError = showErrors && !officeType ? "Choose where this goes." : undefined;
  const divisionError =
    showErrors && isDivision && !division
      ? "Choose a division from the list."
      : undefined;

  /* -------------------------------- closing ------------------------------ */

  const hasChanges = drafts.isDirty || division !== null;

  const requestClose = () => {
    if (isPending) return;
    if (hasChanges && !discardPrompt) {
      setDiscardPrompt(true);
      return;
    }
    onClose();
  };

  const keepEditing = () => setDiscardPrompt(false);

  /* -------------------------------- submit ------------------------------- */

  const submit = async () => {
    if (isPending) return;
    setShowErrors(true);
    if (!officeType) return;

    const notices = drafts.validate();
    if (!notices || notices.length === 0) return;

    let dto: CreateIncomingDocumentAssignmentsDto;
    if (officeType === OfficeTypeEnum.MAIN) {
      dto = { officeType: OfficeTypeEnum.MAIN, noticesOfActions: notices };
    } else if (division) {
      dto = {
        officeType: OfficeTypeEnum.DIVISION,
        incomingDocumentRoutingId: division.routing_id,
        noticesOfActions: notices,
      };
    } else {
      return; // divisionError is now visible
    }

    try {
      await createAssignments({ incomingDocumentId, dto });
      onClose();
    } catch {
      // The mutation's onError already toasts. Stay open so nothing typed is lost.
    }
  };

  return {
    officeType,
    selectOffice,
    officeError,

    division,
    selectDivision,
    divisionError,

    drafts,
    showEditor,

    isSubmitting: isPending,
    discardPrompt,
    requestClose,
    keepEditing,
    discard: onClose,
    submit,
  };
}

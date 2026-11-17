import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "../../../../../lib/api-error";
import type { IncomingDocumentStatus } from "../../types/incoming-document.type";
import { useUpdateIncomingDocumentStatus } from "./api/use-update-incoming-status";

export const ALL_STATUSES: readonly IncomingDocumentStatus[] = [
  "pending",
  "ongoing",
  "complete",
];

export const STATUS_LABEL: Record<IncomingDocumentStatus, string> = {
  pending: "Pending",
  ongoing: "Ongoing",
  complete: "Complete",
};

/** Lower rank = earlier in the workflow. Moving to a lower rank is a rollback. */
const RANK: Record<IncomingDocumentStatus, number> = {
  pending: 0,
  ongoing: 1,
  complete: 2,
};

export const isRollbackMove = (
  from: IncomingDocumentStatus,
  to: IncomingDocumentStatus,
) => RANK[to] < RANK[from];

interface UseChangeStatusModalArgs {
  incomingDocumentId: string;
  currentStatus: IncomingDocumentStatus;
  onClose: () => void;
}

export function useChangeStatusModal({
  incomingDocumentId,
  currentStatus,
  onClose,
}: UseChangeStatusModalArgs) {
  const mutation = useUpdateIncomingDocumentStatus();

  const [target, setTargetState] = useState<IncomingDocumentStatus | null>(null);
  const [remarks, setRemarksState] = useState("");
  const [targetError, setTargetError] = useState<string | null>(null);
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const options = ALL_STATUSES.filter((s) => s !== currentStatus);
  const isRollback = target !== null && isRollbackMove(currentStatus, target);

  const setTarget = useCallback(
    (next: IncomingDocumentStatus) => {
      setTargetState(next);
      setTargetError(null);
      setSubmitError(null);
      setRemarksError(null);
      // Remarks only apply to rollbacks; drop anything typed for a previous target.
      if (!isRollbackMove(currentStatus, next)) setRemarksState("");
    },
    [currentStatus],
  );

  const setRemarks = useCallback((next: string) => {
    setRemarksState(next);
    setRemarksError(null);
    setSubmitError(null);
  }, []);

  const dismissSubmitError = useCallback(() => setSubmitError(null), []);

  const submit = useCallback(() => {
    if (mutation.isPending) return;

    if (target === null) {
      setTargetError("Choose the status to change to.");
      return;
    }

    // Remarks are required for a rollback and never sent for a forward move.
    const rollback = isRollbackMove(currentStatus, target);
    const trimmed = remarks.trim();
    if (rollback && trimmed.length === 0) {
      setRemarksError("Remarks are required when rolling back a status.");
      return;
    }

    setSubmitError(null);
    mutation.mutate(
      {
        id: incomingDocumentId,
        payload: {
          status: target,
          ...(rollback ? { remarks: trimmed } : {}),
        },
      },
      {
        onSuccess: () => {
          toast.success(`Status changed to ${STATUS_LABEL[target]}.`);
          onClose();
        },
        onError: (error) => {
          setSubmitError(getApiErrorMessage(error, "Couldn't update the status."));
        },
      },
    );
  }, [mutation, target, remarks, currentStatus, incomingDocumentId, onClose]);

  return {
    options,
    target,
    setTarget,
    targetError,
    remarks,
    setRemarks,
    remarksError,
    isRollback,
    submit,
    isSubmitting: mutation.isPending,
    submitError,
    dismissSubmitError,
  };
}

import { useCallback, useMemo, useState } from "react";
import type { DivisionName } from "../../../../user-management/types/division-name.type";
import type { DivisionNoticeOfAction } from "../../types/assign-incoming-document-to-dto-division.type";
import { useAssignIncomingDocumentToDivision } from "./api/use-assign-incoming-document-to-division";

/** Soft UI cap so the modal can't grow unbounded. Adjust to match the backend. */
export const MAX_NOTICES = 10;

export interface NoticeDraft {
  /** Stable React key; never reused, so removing a row doesn't shuffle inputs. */
  key: number;
  noticeOfAction: string;
  noticeDescription: string;
}

interface Options {
  incomingDocumentId: string | undefined;
  onClose: () => void;
}

let nextKey = 0;
const createNotice = (): NoticeDraft => ({
  key: nextKey++,
  noticeOfAction: "",
  noticeDescription: "",
});

/**
 * Form state for the Assign Division modal. The modal is mounted only while
 * open, so all state here resets automatically on every open.
 */
export function useAssignDivisionModal({ incomingDocumentId, onClose }: Options) {
  const mutation = useAssignIncomingDocumentToDivision();

  const [division, setDivision] = useState<DivisionName | null>(null);
  // Notices are optional as a section, so the form starts with none.
  const [notices, setNotices] = useState<NoticeDraft[]>([]);
  const [lastAddedKey, setLastAddedKey] = useState<number | null>(null);
  // Errors stay hidden until the first submit attempt, then update live.
  const [submitted, setSubmitted] = useState(false);
  // Rows that existed at a submit attempt. A row added afterwards stays quiet
  // until the next attempt, so "Add another" never opens on a red error.
  const [attemptedKeys, setAttemptedKeys] = useState<ReadonlySet<number>>(new Set());

  const addNotice = useCallback(() => {
    const notice = createNotice();
    setNotices((prev) => (prev.length >= MAX_NOTICES ? prev : [...prev, notice]));
    setLastAddedKey(notice.key);
  }, []);

  const updateNotice = useCallback(
    (
      key: number,
      patch: Partial<Pick<NoticeDraft, "noticeOfAction" | "noticeDescription">>,
    ) => setNotices((prev) => prev.map((n) => (n.key === key ? { ...n, ...patch } : n))),
    [],
  );

  const removeNotice = useCallback(
    (key: number) => setNotices((prev) => prev.filter((n) => n.key !== key)),
    [],
  );

  // Every row needs a notice of action. A row the user doesn't want must be
  // removed explicitly; blank rows are no longer dropped silently.
  const noticeErrors = useMemo(() => {
    const errors: Record<number, string> = {};
    for (const n of notices) {
      if (!n.noticeOfAction.trim()) {
        errors[n.key] = "Notice of action can't be empty. Fill it in or remove this row.";
      }
    }
    return errors;
  }, [notices]);

  const visibleNoticeErrors = useMemo(() => {
    const visible: Record<number, string> = {};
    for (const key of attemptedKeys) {
      if (noticeErrors[key]) visible[key] = noticeErrors[key];
    }
    return visible;
  }, [noticeErrors, attemptedKeys]);

  const divisionError = !division
    ? "Select a division to assign this document to."
    : null;
  const hasNoticeErrors = Object.keys(noticeErrors).length > 0;

  const submit = () => {
    setSubmitted(true);
    setAttemptedKeys(new Set(notices.map((n) => n.key)));
    if (!incomingDocumentId || !division || hasNoticeErrors) return;

    const noticesOfAction: DivisionNoticeOfAction[] = notices.map((n) => ({
      noticeOfAction: n.noticeOfAction.trim(),
      noticeDescription: n.noticeDescription.trim() || undefined,
    }));

    mutation.mutate(
      { incomingDocumentId, divisionId: division.id, noticesOfAction },
      { onSuccess: onClose }, // the hook-level onSuccess already toasts + invalidates
    );
  };

  return {
    division,
    setDivision,
    divisionError: submitted ? divisionError : null,
    notices,
    noticeErrors: visibleNoticeErrors,
    lastAddedKey,
    canAddNotice: notices.length < MAX_NOTICES,
    addNotice,
    updateNotice,
    removeNotice,
    submit,
    isSubmitting: mutation.isPending,
  };
}

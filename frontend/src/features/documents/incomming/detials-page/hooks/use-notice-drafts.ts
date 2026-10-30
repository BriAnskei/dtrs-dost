import { useCallback, useMemo, useState } from "react";
import type { DivisionNoticeOfAction } from "../../types/assign-incoming-document-to-dto-division.type";

/** Soft UI cap so the form can't grow unbounded. Adjust to match the backend. */
export const MAX_NOTICES = 10;

export interface NoticeDraft {
  /** Stable React key; never reused, so removing a row doesn't shuffle inputs. */
  key: number;
  noticeOfAction: string;
  noticeDescription: string;
}

let nextKey = 0;
const createNotice = (): NoticeDraft => ({
  key: nextKey++,
  noticeOfAction: "",
  noticeDescription: "",
});

interface Options {
  max?: number;
  /** Called on every add / edit / remove (e.g. to clear a stale server error). */
  onEdit?: () => void;
}

/**
 * State for a list of notice-of-action drafts: add / edit / remove, validation,
 * and conversion to the API shape. Shared by the Assign Division modal and the
 * Division Assignments panel.
 *
 * Errors stay hidden until the first `validate()` call. Rows added after that
 * stay quiet until the next attempt, so "Add another" never opens on a red error.
 */
export function useNoticeDrafts({ max = MAX_NOTICES, onEdit }: Options = {}) {
  const [notices, setNotices] = useState<NoticeDraft[]>([]);
  const [lastAddedKey, setLastAddedKey] = useState<number | null>(null);
  const [attemptedKeys, setAttemptedKeys] = useState<ReadonlySet<number>>(new Set());

  const add = useCallback(() => {
    onEdit?.();
    const notice = createNotice();
    setNotices((prev) => (prev.length >= max ? prev : [...prev, notice]));
    setLastAddedKey(notice.key);
  }, [max, onEdit]);

  const update = useCallback(
    (
      key: number,
      patch: Partial<Pick<NoticeDraft, "noticeOfAction" | "noticeDescription">>,
    ) => {
      onEdit?.();
      setNotices((prev) => prev.map((n) => (n.key === key ? { ...n, ...patch } : n)));
    },
    [onEdit],
  );

  const remove = useCallback(
    (key: number) => {
      onEdit?.();
      setNotices((prev) => prev.filter((n) => n.key !== key));
    },
    [onEdit],
  );

  const reset = useCallback(() => {
    setNotices([]);
    setLastAddedKey(null);
    setAttemptedKeys(new Set());
  }, []);

  // Every row needs a notice of action. A row the user doesn't want must be
  // removed explicitly; blank rows are not dropped silently.
  const errors = useMemo(() => {
    const result: Record<number, string> = {};
    for (const n of notices) {
      if (!n.noticeOfAction.trim()) {
        result[n.key] = "Notice of action can't be empty. Fill it in or remove this row.";
      }
    }
    return result;
  }, [notices]);

  const noticeErrors = useMemo(() => {
    const visible: Record<number, string> = {};
    for (const key of attemptedKeys) {
      if (errors[key]) visible[key] = errors[key];
    }
    return visible;
  }, [errors, attemptedKeys]);

  /**
   * Marks every current row as attempted (so their errors show) and returns the
   * API payload, or `null` when any row is invalid. An empty list is valid and
   * returns `[]`; callers that need at least one notice check the length.
   */
  const validate = useCallback((): DivisionNoticeOfAction[] | null => {
    setAttemptedKeys(new Set(notices.map((n) => n.key)));
    if (Object.keys(errors).length > 0) return null;

    return notices.map((n) => ({
      noticeOfAction: n.noticeOfAction.trim(),
      noticeDescription: n.noticeDescription.trim() || undefined,
    }));
  }, [notices, errors]);

  const isDirty = useMemo(
    () => notices.some((n) => n.noticeOfAction.trim() || n.noticeDescription.trim()),
    [notices],
  );

  return {
    notices,
    noticeErrors,
    lastAddedKey,
    canAdd: notices.length < max,
    max,
    isDirty,
    add,
    update,
    remove,
    reset,
    validate,
  };
}

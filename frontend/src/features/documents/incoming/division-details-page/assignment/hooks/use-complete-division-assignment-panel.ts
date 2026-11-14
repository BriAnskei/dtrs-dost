import { useQueryClient } from "@tanstack/react-query";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useCompleteIncomingDocumentAssignment } from "../../../shared/hooks/api/use-complete-incoming-document-assignment";

export const ACTION_TAKEN_MAX_LENGTH = 500; // must match the backend DTO

interface UseDivisionCompleteAssignmentPanelParams {
  incomingDocumentId: string;
  assignmentId: string;
  /** Called after the action was saved successfully (closes the panel). */
  onCompleted: () => void;
}

export function useDivisionCompleteAssignmentPanel({
  incomingDocumentId,
  assignmentId,
  onCompleted,
}: UseDivisionCompleteAssignmentPanelParams) {
  const queryClient = useQueryClient();
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [actionTaken, setActionTaken] = useState("");
  const [showError, setShowError] = useState(false);

  // Shared hook: calls PATCH /incoming-documents/assignments/:id/complete and
  // handles the success/error toasts. It only invalidates the admin query keys.
  const { mutate, isPending } = useCompleteIncomingDocumentAssignment(incomingDocumentId);

  // Move focus into the panel when it opens.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setActionTaken(e.target.value);
    if (showError) setShowError(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isPending) return;

    const value = actionTaken.trim();
    if (!value) {
      setShowError(true);
      textareaRef.current?.focus();
      return;
    }

    mutate(
      { assignmentId, dto: { actionTaken: value } },
      {
        onSuccess: () => {
          // Division-side caches (the shared hook only refreshes the admin ones).
          void queryClient.invalidateQueries({
            queryKey: ["division-incoming-document-assignments", incomingDocumentId],
          });
          void queryClient.invalidateQueries({
            queryKey: ["division-incoming-document-details", incomingDocumentId],
          });
          onCompleted();
        },
        onError: () => textareaRef.current?.focus(),
      },
    );
  };

  return {
    fieldId,
    textareaRef,
    actionTaken,
    handleChange,
    handleSubmit,
    showError,
    isPending,
    maxLength: ACTION_TAKEN_MAX_LENGTH,
  };
}

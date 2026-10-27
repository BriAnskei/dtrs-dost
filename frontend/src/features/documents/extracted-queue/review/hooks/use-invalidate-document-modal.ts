import { useState } from "react";
import { useInvalidateExtractedDocumentQueue } from "./api/use-invalidate-extracted-document-queue";

type Options = {
  id: string;
  /** Called after the mutation succeeds. The parent decides what happens next. */
  onInvalidated: () => void;
};

export function useInvalidateDocumentModal({ id, onInvalidated }: Options) {
  const [response, setResponse] = useState("");
  const { mutate, isPending } = useInvalidateExtractedDocumentQueue();

  const handleSubmit = () => {
    if (isPending) return;

    const trimmed = response.trim();

    mutate({ id, response: trimmed || undefined }, { onSuccess: onInvalidated });
  };

  return {
    response,
    setResponse,
    isSubmitting: isPending,
    handleSubmit,
  };
}

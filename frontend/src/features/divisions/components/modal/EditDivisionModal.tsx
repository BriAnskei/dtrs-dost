import { useEffect, useRef, useState } from "react";
import Input from "../../../../components/form/input/InputField";
import Modal from "../../../../components/Modal";
import type { Division } from "../../type/division.type";

interface EditDivisionModalProps {
  division: Division;
  onClose: () => void;
  onSave: (newName: string) => void;
  isSaving?: boolean;
}

export default function EditDivisionModal({
  division,
  onClose,
  onSave,
  isSaving = false,
}: EditDivisionModalProps) {
  const [value, setValue] = useState(division.name);
  const [error, setError] = useState<string | null>(null);

  // Same behavior as the old inline EditableDivisionName: once the mutation
  // settles (isSaving flips back to false, e.g. after refetch), close.
  const wasSaving = useRef(isSaving);
  useEffect(() => {
    if (wasSaving.current && !isSaving) onClose();
    wasSaving.current = isSaving;
  }, [isSaving, onClose]);

  function handleSave() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Name can't be empty.");
      return;
    }
    if (trimmed === division.name) {
      onClose();
      return;
    }
    onSave(trimmed);
  }

  return (
    <Modal
      onClose={onClose}
      closeDisabled={isSaving}
      size="sm"
      header={
        <>
          <div>
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              Rename Division
            </h2>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Update the division&apos;s display name.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </>
      }
      body={
        <Input
          size="sm"
          label="Division Name"
          labelRequired
          id="division-name"
          autoFocus
          value={value}
          disabled={isSaving}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
          placeholder="e.g. Highway Division"
          error={error ?? undefined}
        />
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border-white/8 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </>
      }
    />
  );
}

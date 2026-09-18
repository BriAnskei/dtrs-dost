import { useState } from "react";

interface EditableDivisionNameProps {
  name: string;
  onSave: (newName: string) => void;
  className?: string;
}

export default function EditableDivisionName({
  name,
  onSave,
  className = "",
}: EditableDivisionNameProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setValue(name);
    setError(null);
    setIsEditing(true);
  }

  function cancel() {
    setIsEditing(false);
    setError(null);
  }

  function save() {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Name can't be empty.");
      return;
    }
    if (trimmed === name) {
      setIsEditing(false);
      return;
    }
    onSave(trimmed);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") save();
    if (e.key === "Escape") cancel();
  }

  if (isEditing) {
    return (
      <div className={className}>
        <div className="flex items-center gap-1.5">
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-theme-sm rounded-md border border-secondary/50 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 dark:bg-white/[0.05] dark:text-gray-200 transition"
          />
          <button
            type="button"
            onClick={save}
            aria-label="Save"
            className="shrink-0 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel"
            className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {error && <p className="text-theme-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 group ${className}`}>
      <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
        {name}
      </span>
      <button
        type="button"
        onClick={startEditing}
        aria-label="Rename division"
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-400 hover:text-secondary transition-opacity"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
    </div>
  );
}

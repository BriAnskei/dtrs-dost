import { DIRECTION_OPTIONS } from "../constans";
import type { DocumentDirection } from "../types/mock-types";

interface Props {
  value: DocumentDirection;
  onChange: (v: DocumentDirection) => void;
  disabled?: boolean;
}

export default function DocumentTypeSelector({ value, onChange, disabled }: Props) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2"
      role="radiogroup"
      aria-label="Document type"
    >
      {DIRECTION_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`text-left rounded-xl border p-4 transition disabled:opacity-60 disabled:cursor-not-allowed ${
              active
                ? "border-secondary bg-secondary/5 ring-2 ring-secondary/30 dark:bg-secondary/10"
                : "border-gray-200 bg-white hover:border-secondary/40 dark:border-white/8 dark:bg-white/3"
            }`}
          >
            <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {opt.label}
            </p>
            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              {opt.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}

import { DIRECTION_OPTIONS } from "../../constans";
import type { DocumentDirection } from "../../types/extraction-types";

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
          <label
            key={opt.value}
            className={`relative rounded-xl border p-4 transition ${
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            } ${
              active
                ? "border-secondary bg-secondary/5 ring-2 ring-secondary/30 dark:bg-secondary/10"
                : "border-gray-200 bg-white hover:border-secondary/40 dark:border-white/8 dark:bg-white/3"
            }`}
          >
            <input
              type="radio"
              name="document-direction"
              value={opt.value}
              checked={active}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />

            <p className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {opt.label}
            </p>

            <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
              {opt.description}
            </p>
          </label>
        );
      })}
    </div>
  );
}

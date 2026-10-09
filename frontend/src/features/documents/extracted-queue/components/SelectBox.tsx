import { useEffect, useRef } from "react";

interface SelectCheckboxProps {
  checked: boolean;
  /** Shows the "some selected" dash. Only meaningful when `checked` is false. */
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  disabled?: boolean;
}

/**
 * Small row-selection checkbox with indeterminate support. The shared
 * `Checkbox` component has no indeterminate state, which the header
 * "select all" needs.
 */
export default function SelectCheckbox({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
  disabled = false,
}: SelectCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700"
    />
  );
}

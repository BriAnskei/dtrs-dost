import flatpickr from "flatpickr";
import { useEffect, useRef } from "react";
import "flatpickr/dist/flatpickr.css";
import { CalenderIcon } from "../../icons";
import Label from "./Label";

import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;
import Instance = flatpickr.Instance;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  /** Controlled value ("Y-m-d"). When provided, the picker follows it. */
  value?: string;
  /** Let the user type the date instead of only picking from the calendar. */
  allowInput?: boolean;
  /**
   * Render the calendar on <body> instead of inside the field's container, so it
   * isn't clipped by scrollable parents (modals, cards) and flips above the input
   * when there's no room below.
   */
  appendToBody?: boolean;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  value,
  allowInput = false,
  appendToBody = false,
  disabled = false,
  placeholder,
}: PropsType) {
  const fpRef = useRef<Instance | null>(null);

  // Always call the latest onChange without re-creating the picker on every render.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Initial values are read once at creation; later changes are synced by the effects below.
  const initialRef = useRef({ value, defaultDate });

  useEffect(() => {
    const result = flatpickr(`#${id}`, {
      mode: mode || "single",
      ...(appendToBody
        ? {
            static: false,
            appendTo: document.body,
            position: "auto" as const,
            // Sit above the modal (z-99999).
            onReady: (_d: Date[], _s: string, fp: Instance) => {
              fp.calendarContainer.style.zIndex = "100000";
            },
          }
        : { static: true }),
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      allowInput,
      defaultDate: initialRef.current.value ?? initialRef.current.defaultDate,
      onChange: (...args: Parameters<Hook>) => {
        const handler = onChangeRef.current;
        if (!handler) return;
        (Array.isArray(handler) ? handler : [handler]).forEach((fn) => fn(...args));
      },
    });

    const instance = Array.isArray(result) ? result[0] : result;
    fpRef.current = instance;

    return () => {
      instance.destroy();
      fpRef.current = null;
    };
  }, [id, mode, allowInput, appendToBody]);

  // Controlled value -> picker
  useEffect(() => {
    const fp = fpRef.current;
    if (!fp || value === undefined) return;
    if (fp.input.value !== value) fp.setDate(value, false);
  }, [value]);

  // defaultDate changes (uncontrolled usage). Keyed so a new Date() each render doesn't reset the field.
  const defaultKey =
    defaultDate instanceof Date ? defaultDate.getTime() : String(defaultDate ?? "");
  useEffect(() => {
    const fp = fpRef.current;
    if (!fp || value !== undefined || defaultDate === undefined) return;
    fp.setDate(defaultDate, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by defaultKey on purpose
  }, [defaultKey]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700  dark:focus:border-brand-800"
        />

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}

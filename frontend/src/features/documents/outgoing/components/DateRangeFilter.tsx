import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Calendar, X } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type DateRange,
  type DateRangePreset,
  DEFAULT_DATE_RANGE_PRESETS,
  EMPTY_RANGE,
  formatRangeLabel,
  hasRange,
  isSameRange,
} from "../date-constants";

export interface DateFieldOption<TField extends string = string> {
  value: TField;
  label: string;
}

export interface DateRangeFilterProps<TField extends string = string> {
  value: DateRange;
  /** Fires with a complete range, or with an empty one when cleared. Never with half a range. */
  onChange: (range: DateRange) => void;
  /**
   * Optional "which date?" param (e.g. upload date / date prepared). Pass all three
   * to show a select in the panel and a prefix on the trigger.
   */
  fieldOptions?: DateFieldOption<TField>[];
  field?: TField;
  onFieldChange?: (field: TField) => void;
  /** Quick ranges. Omit for the defaults, pass your own list, or `false` to hide them. */
  presets?: DateRangePreset[] | false;
  /** "YYYY-MM-DD" bounds for selectable days. */
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Classes for the outer wrapper (width / flex behaviour). */
  className?: string;
}

const TRIGGER_CLASS =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-theme-sm rounded-lg border bg-white text-gray-700 hover:border-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:bg-white/3 dark:text-gray-200 transition disabled:opacity-60 disabled:cursor-not-allowed";

const VIEWPORT_MARGIN = 8;

export default function DateRangeFilter<TField extends string = string>({
  value,
  onChange,
  fieldOptions,
  field,
  onFieldChange,
  presets = DEFAULT_DATE_RANGE_PRESETS,
  minDate,
  maxDate,
  placeholder = "Filter by date",
  disabled = false,
  className = "w-full sm:w-auto sm:min-w-64",
}: DateRangeFilterProps<TField>) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const selectId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const calendarInputRef = useRef<HTMLInputElement>(null);

  // The calendar is created once per open; it reads the latest props through refs.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  });

  const commit = useCallback((range: DateRange) => {
    onChangeRef.current(range);
    setOpen(false);
  }, []);

  // 1) Mount the inline range calendar when the panel opens.
  useLayoutEffect(() => {
    const input = calendarInputRef.current;
    if (!open || !input) return;

    const { start, end } = valueRef.current;
    const instance = flatpickr(input, {
      inline: true,
      mode: "range",
      dateFormat: "Y-m-d",
      monthSelectorType: "static",
      showMonths: window.matchMedia("(min-width: 768px)").matches ? 2 : 1,
      minDate: minDate || undefined,
      maxDate: maxDate || undefined,
      defaultDate: start && end ? [start, end] : undefined,
      onChange: (dates, _str, fp) => {
        // The first click yields one date; wait for the second so we never emit half a range.
        if (dates.length !== 2) return;
        commit({
          start: fp.formatDate(dates[0], "Y-m-d"),
          end: fp.formatDate(dates[1], "Y-m-d"),
        });
      },
    });

    return () => instance.destroy();
  }, [open, minDate, maxDate, commit]);

  // 2) Position the panel under the trigger (flip above / clamp to the viewport).
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const rect = trigger.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = panel;

    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - width - VIEWPORT_MARGIN),
    );
    const below = rect.bottom + 6;
    const above = rect.top - 6 - height;
    const fitsBelow = below + height <= window.innerHeight - VIEWPORT_MARGIN;
    const top = !fitsBelow && above >= VIEWPORT_MARGIN ? above : below;

    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  // 3) Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      const path = e.composedPath();
      if (
        (panelRef.current && path.includes(panelRef.current)) ||
        (triggerRef.current && path.includes(triggerRef.current))
      ) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = hasRange(value);
  const rangeLabel = formatRangeLabel(value);
  const fieldLabel = fieldOptions?.find((o) => o.value === field)?.label;
  const showFieldSelect =
    !!fieldOptions?.length && field !== undefined && !!onFieldChange;
  const presetList = presets === false ? [] : presets;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={active ? `${fieldLabel ? `${fieldLabel}: ` : ""}${rangeLabel}` : undefined}
        onClick={() => setOpen((o) => !o)}
        className={`${TRIGGER_CLASS} ${active ? "pr-9 border-secondary/50" : "border-gray-200 dark:border-white/8"}`}
      >
        <Calendar className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        {active ? (
          <span className="truncate">
            {fieldLabel && (
              <span className="text-gray-400 dark:text-gray-500">{fieldLabel}: </span>
            )}
            {rangeLabel}
          </span>
        ) : (
          <span className="truncate text-gray-400 dark:text-gray-500">{placeholder}</span>
        )}
      </button>

      {active && !disabled && (
        <button
          type="button"
          aria-label="Clear date range"
          onClick={() => onChange(EMPTY_RANGE)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-danger dark:hover:bg-white/5 transition-colors"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Select date range"
            style={{
              position: "fixed",
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              visibility: pos ? "visible" : "hidden",
            }}
            className="z-[100000] max-h-[calc(100vh-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-white/8 dark:bg-gray-900"
          >
            {showFieldSelect && (
              <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-white/5">
                <label
                  htmlFor={selectId}
                  className="text-theme-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap"
                >
                  Date field
                </label>
                <select
                  id={selectId}
                  value={field}
                  onChange={(e) => onFieldChange(e.target.value as TField)}
                  className="flex-1 md:flex-none md:w-52 px-2 py-1.5 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/8 dark:bg-gray-900 dark:text-gray-200 dark:scheme-dark"
                >
                  {fieldOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col md:flex-row">
              {presetList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-b border-gray-100 p-2 dark:border-white/5 md:w-40 md:flex-col md:flex-nowrap md:gap-0.5 md:border-b-0 md:border-r">
                  {presetList.map((preset) => {
                    const selected = isSameRange(preset.getRange(), value);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => commit(preset.getRange())}
                        className={`rounded-lg px-3 py-1.5 text-left text-theme-sm whitespace-nowrap transition-colors ${
                          selected
                            ? "bg-secondary/10 font-medium text-secondary"
                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-center p-2 [&_.flatpickr-calendar]:border-0 [&_.flatpickr-calendar]:bg-transparent [&_.flatpickr-calendar]:shadow-none">
                {/* flatpickr turns this into a visible text input in inline mode, so hide it. */}
                <input
                  ref={calendarInputRef}
                  type="text"
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
import "flatpickr/dist/flatpickr.css";
import { Calendar, ChevronDown, X } from "lucide-react";
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
  /** Used as the tooltip / accessible name of the icon-only trigger when no range is set. */
  placeholder?: string;
  disabled?: boolean;
  /**
   * Classes for the outer wrapper (width / flex behaviour). Applied only while a range is
   * active; with no filter the trigger shrinks to just the calendar icon.
   */
  className?: string;
}

type Side = "start" | "end";
type Draft = { start: string; end: string };

// Width / horizontal padding are added per state (icon-only vs. active) below.
const TRIGGER_CLASS =
  "flex items-center gap-2 py-2 text-left text-theme-sm rounded-lg border bg-white text-gray-700 hover:border-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:bg-white/3 dark:text-gray-200 transition disabled:opacity-60 disabled:cursor-not-allowed";

const VIEWPORT_MARGIN = 8;

const formatDay = (iso: string) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Select date";

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
  // Working copy while the panel is open; only committed on Apply / preset.
  const [draft, setDraft] = useState<Draft>({ start: "", end: "" });
  // Which side the single calendar is currently editing.
  const [active, setActive] = useState<Side>("start");
  const [showPresets, setShowPresets] = useState(false);

  const selectId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const calendarInputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<Instance | null>(null);

  // The calendar is created once per open; it reads the latest state through refs.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const draftRef = useRef(draft);
  const activeRef = useRef(active);
  useLayoutEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
    draftRef.current = draft;
    activeRef.current = active;
  });

  const commit = useCallback((range: DateRange) => {
    onChangeRef.current(range);
    setOpen(false);
  }, []);

  const openPanel = () => {
    setDraft({ start: value.start ?? "", end: value.end ?? "" });
    setActive("start");
    setShowPresets(false);
    setPos(null);
    setOpen(true);
  };

  // Picking a day edits the active side. If it would cross the other side, the other
  // side follows; otherwise it is left alone. After a start pick we move on to the end.
  const pick = useCallback((iso: string) => {
    const side = activeRef.current;
    setDraft((d) =>
      side === "start"
        ? { start: iso, end: d.end && d.end >= iso ? d.end : iso }
        : { start: d.start && d.start <= iso ? d.start : iso, end: iso },
    );
    if (side === "start") setActive("end");
  }, []);

  // 1) Mount one inline calendar (month + year dropdowns, so any month is reachable).
  useLayoutEffect(() => {
    const input = calendarInputRef.current;
    if (!open || !input) return;

    const { start, end } = valueRef.current;
    const instance = flatpickr(input, {
      inline: true,
      dateFormat: "Y-m-d",
      monthSelectorType: "dropdown",
      minDate: minDate || undefined,
      maxDate: maxDate || undefined,
      defaultDate: start || end || undefined,
      onChange: (dates, _str, fp) => {
        if (dates[0]) pick(fp.formatDate(dates[0], "Y-m-d"));
      },
      // Paint the range with flatpickr's own range classes: rounded start cap,
      // rounded end cap and a filled band in between.
      onDayCreate: (_dates, _str, fp, dayElem) => {
        const { start: s, end: e } = draftRef.current;
        if (!s || !e) return;
        const iso = fp.formatDate(dayElem.dateObj, "Y-m-d");
        if (iso < s || iso > e) return;
        dayElem.classList.remove("selected");
        if (s === e) {
          dayElem.classList.add("selected");
        } else if (iso === s) {
          dayElem.classList.add("startRange");
        } else if (iso === e) {
          dayElem.classList.add("endRange");
        } else {
          dayElem.classList.add("inRange");
        }
      },
    });
    fpRef.current = instance;

    return () => {
      instance.destroy();
      fpRef.current = null;
    };
  }, [open, minDate, maxDate, pick]);

  // Keep the calendar in sync with the draft / active side. setDate(..., false) jumps the
  // view to the active side's month and redraws so the range styling updates.
  useEffect(() => {
    if (!open) return;
    const fp = fpRef.current;
    if (!fp) return;
    const iso = draft[active];
    if (iso) fp.setDate(iso, false);
    else fp.redraw();
  }, [open, draft, active]);

  // 2) Position the panel under the trigger (flip above / clamp to the viewport).
  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const rect = trigger.getBoundingClientRect();
    const { width, height } = panel.getBoundingClientRect();

    // Open left-aligned with the trigger; if that would run off the right edge,
    // align the panel's right edge with the trigger's instead, then clamp to the viewport.
    const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
    const preferred = rect.left <= maxLeft ? rect.left : rect.right - width;
    const left = Math.max(VIEWPORT_MARGIN, Math.min(preferred, maxLeft));
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
    // The panel's size can change after it first renders (calendar mount, fonts,
    // quick ranges, Apply button), so re-fit whenever it resizes.
    const observer =
      typeof ResizeObserver !== "undefined" && panelRef.current
        ? new ResizeObserver(reposition)
        : null;
    if (observer && panelRef.current) observer.observe(panelRef.current);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  // The panel height changes when quick ranges / the footer appear, so re-check the fit.
  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, showPresets, draft, reposition]);

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

  const activeRange = hasRange(value);
  const rangeLabel = formatRangeLabel(value);
  const fieldLabel = fieldOptions?.find((o) => o.value === field)?.label;
  const showFieldSelect =
    !!fieldOptions?.length && field !== undefined && !!onFieldChange;
  const presetList = presets === false ? [] : presets;
  // The footer only appears once there is something to apply.
  const canApply =
    !!draft.start &&
    !!draft.end &&
    (draft.start !== (value.start ?? "") || draft.end !== (value.end ?? ""));

  const tab = (side: Side, label: string) => {
    const selected = active === side;
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => setActive(side)}
        className={`flex flex-1 flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-colors ${
          selected
            ? "border-secondary bg-secondary/10"
            : "border-gray-200 hover:border-secondary/40 dark:border-white/8"
        }`}
      >
        <span className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <span
          className={`text-theme-sm ${
            draft[side]
              ? "text-gray-800 dark:text-gray-100"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {formatDay(draft[side])}
        </span>
      </button>
    );
  };

  return (
    // No filter -> shrink to just the icon. Filter set -> use the caller's width classes.
    <div className={`relative ${activeRange ? className : "w-fit shrink-0"}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={activeRange ? undefined : placeholder}
        title={
          activeRange
            ? `${fieldLabel ? `${fieldLabel}: ` : ""}${rangeLabel}`
            : placeholder
        }
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={`${TRIGGER_CLASS} ${
          activeRange
            ? "w-full pl-3 pr-9 border-secondary/50"
            : "justify-center px-2.5 border-gray-200 dark:border-white/8"
        }`}
      >
        <Calendar className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        {activeRange && (
          <span className="truncate">
            {fieldLabel && (
              <span className="text-gray-400 dark:text-gray-500">{fieldLabel}: </span>
            )}
            {rangeLabel}
          </span>
        )}
      </button>

      {activeRange && !disabled && (
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
            className="z-[100000] max-h-[calc(100vh-1rem)] w-80 max-w-[calc(100vw-1rem)] md:w-max overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-white/8 dark:bg-gray-900"
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
                  className="min-w-0 flex-1 px-2 py-1.5 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/8 dark:bg-gray-900 dark:text-gray-200 dark:scheme-dark"
                >
                  {fieldOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Wide layout on md+: controls on the left, calendar on the right.
                On small screens everything stacks in reading order. */}
            <div className="flex flex-col md:grid md:grid-cols-[13rem_auto] md:grid-rows-[auto_1fr_auto]">
              {/* Start / End switcher: one calendar, two sides. */}
              <div className="flex gap-2 p-3 pb-1 md:col-start-1 md:row-start-1 md:flex-col md:pb-2">
                {tab("start", "Start date")}
                {tab("end", "End date")}
              </div>

              <div className="flex justify-center px-1 pb-1 md:col-start-2 md:row-span-3 md:row-start-1 md:border-l md:border-gray-100 md:p-2 dark:md:border-white/5 [&_.flatpickr-calendar]:border-0 [&_.flatpickr-calendar]:bg-transparent [&_.flatpickr-calendar]:shadow-none">
                {/* flatpickr turns this into a visible text input in inline mode, so hide it. */}
                <input
                  ref={calendarInputRef}
                  type="text"
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </div>

              {/* Quick ranges stay out of the way until asked for. */}
              {presetList.length > 0 && (
                <div className="border-t border-gray-100 dark:border-white/5 md:col-start-1 md:row-start-2 md:border-t-0">
                  {/* On small screens quick ranges collapse; on wide screens there is room to show them. */}
                  <button
                    type="button"
                    aria-expanded={showPresets}
                    onClick={() => setShowPresets((s) => !s)}
                    className="flex w-full items-center justify-between px-3 py-2 text-theme-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors md:hidden"
                  >
                    Quick ranges
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${showPresets ? "rotate-180" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                  {
                    <div
                      className={`${showPresets ? "flex" : "hidden"} flex-wrap gap-1.5 px-3 pb-3 md:flex md:pt-1`}
                    >
                      {presetList.map((preset) => {
                        const selected = isSameRange(preset.getRange(), value);
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => commit(preset.getRange())}
                            className={`rounded-full border px-2.5 py-1 text-theme-xs whitespace-nowrap transition-colors ${
                              selected
                                ? "border-secondary bg-secondary/10 font-medium text-secondary"
                                : "border-gray-200 text-gray-600 hover:border-secondary/40 dark:border-white/8 dark:text-gray-300"
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  }
                </div>
              )}

              {canApply && (
                <div className="flex justify-end border-t border-gray-100 px-3 py-2 dark:border-white/5 md:col-start-1 md:row-start-3 md:border-t-0">
                  <button
                    type="button"
                    onClick={() => commit({ start: draft.start, end: draft.end })}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-theme-sm font-medium text-white hover:bg-secondary/90 transition-colors md:w-full"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

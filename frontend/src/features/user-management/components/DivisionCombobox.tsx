import { Check, Loader2, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { THIN_SCROLLBAR } from "../../../contant/ThinScrollBar";
import { useSearchDivisions } from "../hooks/use-division-search";
import type { DivisionName } from "../types/division-name.type";

const MIN_SEARCH_LENGTH = 2;
const CREATE_OPTION_ID = "division-option-create";

/** Mirrors the backend rule: names match case-insensitively, ignoring outer spaces. */
const normalizeName = (s: string) => s.trim().toLowerCase();

export default function DivisionCombobox({
  value,
  onChange,
  onSelect,
  error,
  requireSelection = false,
  allowCreate = false,
  required = false,
  disabled = false,
}: {
  value: string | undefined;
  onChange?: (division: string | null) => void;
  /** Fires with the full division on pick, and with null as soon as the user edits the text. */
  onSelect?: (division: DivisionName | null) => void;
  error?: string;
  /**
   * Strict mode: typed text is never a value, only a picked suggestion is.
   * Do not combine with `allowCreate`.
   */
  requireSelection?: boolean;
  /**
   * Create mode: typed text IS the value and the backend creates the division
   * if it doesn't exist. Adds loading state, a "Create" row, and a message.
   */
  allowCreate?: boolean;
  /** Shows the red asterisk in the label and sets aria-required. */
  required?: boolean;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isSelected, setIsSelected] = useState(Boolean(value));
  const [touched, setTouched] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const enhanced = requireSelection || allowCreate;

  const { data: divisions, isFetching, isDebouncing } = useSearchDivisions(query);
  const results = divisions ?? [];
  const trimmed = query.trim();
  const canSearch = trimmed.length >= MIN_SEARCH_LENGTH;
  const isSettled = !isDebouncing && !isFetching;
  const isSearching = canSearch && !isSettled;

  const hasExactMatch = results.some(
    (d) => normalizeName(d.division_name) === normalizeName(trimmed),
  );
  // Only offered once results settle, so it never flashes for a name that is
  // about to match.
  const showCreateRow =
    allowCreate && open && canSearch && isSettled && !isSelected && !hasExactMatch;

  const optionCount = results.length + (showCreateRow ? 1 : 0);
  const showListbox = open && canSearch && optionCount > 0;
  const showStatus =
    enhanced &&
    open &&
    canSearch &&
    results.length === 0 &&
    (isSearching || requireSelection);

  // Strict mode highlights the top match so Enter picks it. Create mode only
  // highlights the Create row when it is the sole item, so Enter can't silently
  // pick a fuzzy match when the user meant a new name. Highlighting waits for
  // settle so Enter can't pick a stale row.
  const autoHighlight =
    showListbox &&
    isSettled &&
    (requireSelection || (allowCreate && results.length === 0));
  const highlightedIndex = activeIndex !== -1 ? activeIndex : autoHighlight ? 0 : -1;

  const activeOptionId =
    highlightedIndex < 0
      ? undefined
      : highlightedIndex < results.length
        ? `division-option-${results[highlightedIndex].id}`
        : showCreateRow && highlightedIndex === results.length
          ? CREATE_OPTION_ID
          : undefined;

  // Strict mode: the specific message wins over the parent's generic error.
  const hasUnselectedText = requireSelection && !isSelected && trimmed.length > 0;
  const message =
    hasUnselectedText && (Boolean(error) || (touched && !open))
      ? "Choose a division from the suggestions. Typed text alone can't be assigned."
      : error;

  // Create mode: tell the user what saving will do. Hidden while the list is
  // open (the Create row already says it) and whenever there's a real error.
  const creationHint =
    allowCreate && !message && !open && !isSelected && canSearch && isSettled
      ? hasExactMatch
        ? { isNew: false, text: "Matches an existing division." }
        : {
            isNew: true,
            text: `New division: “${trimmed}” will be created when you save.`,
          }
      : null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keep the keyboard-highlighted option visible in long lists.
  useEffect(() => {
    if (!activeOptionId) return;
    document.getElementById(activeOptionId)?.scrollIntoView({ block: "nearest" });
  }, [activeOptionId]);

  function selectDivision(division: DivisionName) {
    setQuery(division.division_name);
    setIsSelected(true);
    onChange?.(division.division_name);
    onSelect?.(division);
    setOpen(false);
    setActiveIndex(-1);
  }

  /** Keep the typed text as the value (create mode). The parent already has it. */
  function commitTyped() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function clearSelection() {
    setQuery("");
    setIsSelected(false);
    setTouched(false);
    setOpen(false);
    setActiveIndex(-1);
    onChange?.(null);
    onSelect?.(null);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (
      e.key === "ArrowDown" &&
      !open &&
      canSearch &&
      (results.length > 0 || allowCreate)
    ) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (!showListbox) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(highlightedIndex + 1, optionCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(highlightedIndex - 1, 0));
    } else if (e.key === "Enter") {
      // Never let Enter submit the surrounding form while the list is open.
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        selectDivision(results[highlightedIndex]);
      } else if (allowCreate) {
        commitTyped();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function highlight(name: string) {
    const q = query.trim();
    if (!q) return name;
    const idx = name.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return name;
    return (
      <>
        {name.slice(0, idx)}
        <span className="font-semibold text-secondary">
          {name.slice(idx, idx + q.length)}
        </span>
        {name.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-1 relative" ref={rootRef}>
      <label
        htmlFor="division"
        className="text-theme-xs font-medium text-gray-600 dark:text-gray-400"
      >
        Division {required && <span className="text-danger">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id="division"
          role="combobox"
          aria-expanded={showListbox}
          aria-controls="division-listbox"
          aria-autocomplete="list"
          aria-required={required || requireSelection || undefined}
          aria-invalid={Boolean(message)}
          aria-describedby={message || creationHint ? "division-message" : undefined}
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          type="text"
          value={query}
          disabled={disabled}
          placeholder={
            requireSelection
              ? "Search and select a division"
              : allowCreate
                ? "Search or enter a new division"
                : "Select division"
          }
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setIsSelected(false);
            onChange?.(next.trim() ? next : null);
            onSelect?.(null);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (enhanced && isSelected) return;
            if (canSearch) setOpen(true);
          }}
          onBlur={() => {
            if (!enhanced) return;
            setOpen(false);
            if (requireSelection) setTouched(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full px-3 py-2 text-theme-sm rounded-lg border bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 transition disabled:opacity-60 dark:bg-white/3 dark:text-gray-200 dark:placeholder-gray-500 ${
            enhanced ? "pr-16" : ""
          } ${
            message
              ? "border-danger focus:ring-danger/30"
              : "border-gray-200 focus:ring-secondary/40 focus:border-secondary dark:border-white/8"
          }`}
        />

        {enhanced && (
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            {isSearching && !isSelected && (
              <Loader2
                className="h-4 w-4 animate-spin text-gray-400"
                aria-hidden="true"
              />
            )}
            {isSelected && (
              <Check className="h-4 w-4 text-success-500" aria-hidden="true" />
            )}
            {query && !disabled && (
              <button
                type="button"
                aria-label="Clear division"
                onMouseDown={(e) => e.preventDefault()}
                onClick={clearSelection}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {showListbox && (
          <div
            id="division-listbox"
            role="listbox"
            aria-busy={!isSettled}
            // Keep focus on the input while clicking options or dragging the scrollbar.
            onMouseDown={(e) => e.preventDefault()}
            className={`absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg transition-opacity dark:border-white/8 dark:bg-gray-900 ${THIN_SCROLLBAR} ${
              isSettled ? "" : "opacity-60"
            }`}
          >
            {results.map((d: DivisionName, i: number) => (
              <div
                key={d.id}
                id={`division-option-${d.id}`}
                role="option"
                tabIndex={-1}
                aria-selected={query === d.division_name}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectDivision(d);
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`px-3 py-2 text-theme-sm cursor-pointer flex items-center justify-between ${
                  highlightedIndex === i
                    ? "bg-secondary/10 text-secondary"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                <span>{highlight(d.division_name)}</span>
                {query === d.division_name && <span className="text-secondary">✓</span>}
              </div>
            ))}

            {showCreateRow && (
              <div
                id={CREATE_OPTION_ID}
                role="option"
                tabIndex={-1}
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commitTyped();
                }}
                onMouseEnter={() => setActiveIndex(results.length)}
                className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-theme-sm ${
                  results.length > 0 ? "border-t border-gray-200 dark:border-white/8" : ""
                } ${
                  highlightedIndex === results.length
                    ? "bg-secondary/10 text-secondary"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Create “<span className="font-semibold">{trimmed}</span>”
                  </span>
                </span>
                <span className="shrink-0 text-theme-xs text-gray-400 dark:text-gray-500">
                  New division
                </span>
              </div>
            )}
          </div>
        )}

        {showStatus && (
          <div
            role="status"
            className="absolute z-10 mt-1 flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-theme-sm text-gray-500 shadow-lg dark:border-white/8 dark:bg-gray-900 dark:text-gray-400"
          >
            {isSettled ? (
              "No matching division. Check the spelling or try another name."
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Searching…
              </>
            )}
          </div>
        )}
      </div>

      {/* Announces the selection to screen readers; visually hidden. */}
      <span className="sr-only" role="status">
        {enhanced && isSelected ? `Selected ${query}` : ""}
      </span>

      {message ? (
        <span id="division-message" role="alert" className="text-theme-xs text-danger">
          {message}
        </span>
      ) : (
        creationHint && (
          <span
            id="division-message"
            role="status"
            className={`text-theme-xs ${
              creationHint.isNew ? "text-secondary" : "text-gray-500 dark:text-gray-400"
            }`}
          >
            {creationHint.text}
          </span>
        )
      )}
    </div>
  );
}

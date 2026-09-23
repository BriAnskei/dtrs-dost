import { useEffect, useRef, useState } from "react";
import { THIN_SCROLLBAR } from "../../../contant/ThinScrollBar";
import { useSearchDivisions } from "../hooks/use-division-search";
import type { DivisionName } from "../types/division-name.type";

export default function DivisionCombobox({
  value,
  onChange,
  error,
}: {
  value: string | undefined;
  onChange: (division: string | null) => void;
  error?: string;
}) {
  const [query, setQuery] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data: divisions } = useSearchDivisions(query);
  const results = divisions ?? [];
  const showDropdown = open && query.trim().length >= 2 && results.length > 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectDivision(division: DivisionName) {
    setQuery(division.division_name);
    onChange(division.division_name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex === -1) return;
      selectDivision(results[activeIndex]);
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
        Division
      </label>

      <div className="relative">
        <input
          id="division"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="division-listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 && results[activeIndex]
              ? `division-option-${results[activeIndex].id}`
              : undefined
          }
          autoComplete="off"
          type="text"
          value={query}
          placeholder="Select division"
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next.trim() ? next : null);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full px-3 py-2 text-theme-sm rounded-lg border bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 transition dark:bg-white/3 dark:text-gray-200 dark:placeholder-gray-500 ${
            error
              ? "border-danger focus:ring-danger/30"
              : "border-gray-200 focus:ring-secondary/40 focus:border-secondary dark:border-white/8"
          }`}
        />

        {showDropdown && (
          <div
            id="division-listbox"
            role="listbox"
            className={`absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-white/8 dark:bg-gray-900 ${THIN_SCROLLBAR}`}
          >
            {results.map((d: DivisionName, i: number) => (
              <div
                key={d.id}
                id={`division-option-${d.id}`}
                role="option"
                tabIndex={-1}
                aria-selected={query === d.division_name}
                onMouseDown={() => selectDivision(d)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`px-3 py-2 text-theme-sm cursor-pointer flex items-center justify-between ${
                  activeIndex === i
                    ? "bg-secondary/10 text-secondary"
                    : "text-gray-700 dark:text-gray-200"
                }`}
              >
                <span>{highlight(d.division_name)}</span>
                {query === d.division_name && <span className="text-secondary">✓</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <span className="text-theme-xs text-danger">{error}</span>}
    </div>
  );
}

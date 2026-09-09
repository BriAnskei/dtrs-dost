import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

export interface Division {
  id: string;
  name: string;
}

export interface DivisionMultiSelectProps {
  label: string;
  value: string[];
  placeholder?: string;
  onChange: (value: string[]) => void;
}

const DivisionMultiSelect: React.FC<DivisionMultiSelectProps> = ({
  label,
  value,
  placeholder = "Select division(s)",
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchDivisions() {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const response = await axios.get(`${apiUrl}/divisions`);
        console.log("[DivisionMultiSelect] /divisions raw response:", response.data);

        // Defensively handle either a bare array or a wrapped { data: [...] } shape
        const list: Division[] = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

        if (list.length === 0) {
          console.warn("[DivisionMultiSelect] No divisions parsed from response.");
        }
        setDivisions(list);
        setLoadError(null);
      } catch (error) {
        console.error("Failed to fetch divisions:", error);
        setLoadError("Failed to load divisions");
      }
    }
    fetchDivisions();
  }, []);

  useEffect(() => {
    console.log("[DivisionMultiSelect] divisions:", divisions.length, "value(ids):", value);
  }, [divisions, value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = divisions.filter((d) => value.includes(d.id));
  const filtered = divisions.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()));

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== id));
  };

  return (
    <div className="grid grid-cols-[180px_1fr] items-start gap-4">
      <div className="flex items-center gap-1.5 pt-2">
        <label className="text-theme-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </label>
      </div>

      <div className="relative" ref={wrapperRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`text-theme-sm focus:border-secondary focus:ring-secondary/20 flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-left text-gray-800 transition outline-none focus:ring-2 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 ${open ? "border-secondary ring-secondary/20 ring-2" : ""}`}
        >
          {selected.length === 0 ? (
            <span className="text-gray-400 dark:text-gray-600">{loadError ?? placeholder}</span>
          ) : (
            selected.map((d) => (
              <span
                key={d.id}
                className="bg-secondary/10 text-secondary dark:bg-secondary/15 dark:text-secondary text-theme-xs flex items-center gap-1 rounded-md px-2 py-0.5 font-medium"
              >
                {d.name}
                <span
                  role="button"
                  onClick={(e) => remove(d.id, e)}
                  className="hover:text-secondary/70 cursor-pointer text-[13px] leading-none"
                >
                  ×
                </span>
              </span>
            ))
          )}
          <svg
            className={`ml-auto h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${
              open ? "rotate-180" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <div className="border-b border-gray-100 p-2 dark:border-gray-800">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search divisions…"
                className="text-theme-sm focus:border-secondary w-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-gray-800 placeholder-gray-400 outline-none dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder-gray-600"
              />
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {loadError ? (
                <p className="text-theme-xs px-3 py-2 text-red-400">{loadError}</p>
              ) : filtered.length === 0 ? (
                <p className="text-theme-xs px-3 py-2 text-gray-400 dark:text-gray-600">
                  No divisions found.
                </p>
              ) : (
                filtered.map((d) => {
                  const checked = value.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className="text-theme-sm flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(d.id)}
                        className="accent-secondary h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600"
                      />
                      {d.name}
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DivisionMultiSelect;

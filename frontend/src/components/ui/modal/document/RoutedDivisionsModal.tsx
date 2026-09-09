import { useState, useEffect } from "react";
import axios from "axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DivisionListItem {
  id: string;
  name: string;
}

interface RoutedDivisionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentCode: string;
  documentSubject: string;
  routedDivisions: string[];
  onSave: (divisions: string[]) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RoutedDivisionsModal({
  isOpen,
  onClose,
  documentCode,
  documentSubject,
  routedDivisions,
  onSave,
}: RoutedDivisionsModalProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draftDivisions, setDraftDivisions] = useState<string[]>(routedDivisions);
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const [availableDivisions, setAvailableDivisions] = useState<DivisionListItem[]>([]);
  const [loadingDivisions, setLoadingDivisions] = useState(false);

  // Fetch divisions from API on mount
  useEffect(() => {
    async function fetchDivisions() {
      setLoadingDivisions(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
        const response = await axios.get<DivisionListItem[]>(`${apiUrl}/divisions`);
        setAvailableDivisions(response.data);
      } catch (error) {
        console.error("Failed to fetch divisions:", error);
      } finally {
        setLoadingDivisions(false);
      }
    }

    fetchDivisions();
  }, []);

  // Reset local state whenever the modal opens (or a different record is targeted)
  useEffect(() => {
    if (isOpen) {
      setMode("view");
      setDraftDivisions(routedDivisions);
      setSelectedToAdd("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, documentCode]);

  if (!isOpen) return null;

  const availableToAdd = availableDivisions
    .filter((d) => !draftDivisions.includes(d.name))
    .map((d) => d.name);

  function handleRemove(division: string) {
    setDraftDivisions((prev) => prev.filter((d) => d !== division));
  }

  function handleAdd() {
    if (!selectedToAdd) return;
    setDraftDivisions((prev) => [...prev, selectedToAdd]);
    setSelectedToAdd("");
  }

  function handleSave() {
    onSave(draftDivisions);
    setMode("view");
    onClose();
  }

  function handleCancelEdit() {
    setDraftDivisions(routedDivisions);
    setSelectedToAdd("");
    setMode("view");
  }

  function handleClose() {
    setDraftDivisions(routedDivisions);
    setMode("view");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-99999999 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl dark:bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-100 px-5 py-4 dark:border-white/[0.08]">
          <h3 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            Routed Divisions
          </h3>
          <p className="text-theme-xs mt-1 text-gray-500 dark:text-gray-400">
            <span className="text-primary dark:text-secondary font-mono font-semibold">
              {documentCode}
            </span>{" "}
            &middot; {documentSubject}
          </p>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-4">
          {mode === "view" ? (
            draftDivisions.length === 0 ? (
              <p className="text-theme-xs text-center text-gray-400 dark:text-gray-500">
                This document has not been routed to any division yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {draftDivisions.map((division) => (
                  <li
                    key={division}
                    className="text-theme-xs flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-gray-700 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-300"
                  >
                    <svg
                      className="text-secondary h-4 w-4 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m9-13v6m-3-3h6"
                      />
                    </svg>
                    {division}
                  </li>
                ))}
              </ul>
            )
          ) : (
            <>
              {/* Editable list */}
              {draftDivisions.length === 0 ? (
                <p className="text-theme-xs text-center text-gray-400 dark:text-gray-500">
                  No divisions routed yet. Add one below.
                </p>
              ) : (
                <ul className="space-y-2">
                  {draftDivisions.map((division) => (
                    <li
                      key={division}
                      className="text-theme-xs flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-gray-700 dark:border-white/[0.05] dark:bg-white/[0.03] dark:text-gray-300"
                    >
                      <span>{division}</span>
                      <button
                        onClick={() => handleRemove(division)}
                        className="text-danger rounded p-1 hover:bg-red-50 dark:hover:bg-red-500/10"
                        title={`Unroute from ${division}`}
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Add new division */}
              <div className="flex items-center gap-2 border-t border-gray-100 pt-3 dark:border-white/[0.05]">
                {loadingDivisions ? (
                  <div className="text-theme-xs text-gray-400">Loading divisions…</div>
                ) : (
                  <>
                    <select
                      value={selectedToAdd}
                      onChange={(e) => setSelectedToAdd(e.target.value)}
                      className="text-theme-xs focus:ring-secondary/40 focus:border-secondary flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 transition focus:ring-2 focus:outline-none dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200"
                    >
                      <option value="">Select a division to add…</option>
                      {availableToAdd.map((division) => (
                        <option key={division} value={division}>
                          {division}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAdd}
                      disabled={!selectedToAdd}
                      className="bg-secondary text-theme-xs rounded-lg px-3 py-2 font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Add
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-white/[0.08]">
          {mode === "view" ? (
            <>
              <button
                onClick={handleClose}
                className="text-theme-xs rounded-lg border border-[#e2e8f0] px-3.5 py-2 font-medium text-[#475569] transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.06]"
              >
                Close
              </button>
              <button
                onClick={() => setMode("edit")}
                className="bg-secondary text-theme-xs rounded-lg px-3.5 py-2 font-medium text-white transition-colors hover:opacity-90"
              >
                Update Routing
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                className="text-theme-xs rounded-lg border border-[#e2e8f0] px-3.5 py-2 font-medium text-[#475569] transition-colors hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-secondary text-theme-xs rounded-lg px-3.5 py-2 font-medium text-white transition-colors hover:opacity-90"
              >
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

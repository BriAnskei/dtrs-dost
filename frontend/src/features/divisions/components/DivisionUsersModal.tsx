import { useMemo, useState } from "react";
import type { Division } from "../type/division.type";

interface DivisionUsersModalProps {
  division: Division;
  onClose: () => void;
}

export default function DivisionUsersModal({
  division,
  onClose,
}: DivisionUsersModalProps) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.toLowerCase();
    if (!query) return division.users;
    return division.users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
    );
  }, [q, division.users]);

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-xl max-h-[80vh] flex flex-col">
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-white/[0.05]">
          <div>
            <h3 className="text-theme-md font-semibold text-gray-800 dark:text-white/90">
              {division.name}
            </h3>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {division.userCount} user{division.userCount === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users…"
            className="w-full px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:placeholder-gray-500 transition"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
          {filtered.length === 0 ? (
            <p className="text-theme-sm text-gray-400 text-center py-8">
              No users match.
            </p>
          ) : (
            filtered.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-white/[0.05] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90 truncate">
                    {u.fullName}
                  </p>
                  <p className="text-theme-xs text-gray-400 dark:text-gray-500 truncate">
                    {u.email}
                  </p>
                </div>
                {!u.isActive && (
                  <span className="text-theme-xs text-red-500 shrink-0 ml-3">
                    Disabled
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

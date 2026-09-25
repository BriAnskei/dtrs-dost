import { useMemo, useState } from "react";
import Input from "../../../components/form/input/InputField";
import Modal from "../../../components/Modal";
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
    <Modal
      onClose={onClose}
      size="md"
      header={
        <div className="w-full space-y-3">
          <div className="flex items-start justify-between">
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

          <Input
            size="sm"
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users…"
          />
        </div>
      }
      body={
        filtered.length === 0 ? (
          <p className="text-theme-sm text-gray-400 text-center py-8">No users match.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
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
            ))}
          </div>
        )
      }
    />
  );
}

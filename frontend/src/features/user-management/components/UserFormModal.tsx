import { useState } from "react";
import { createPortal } from "react-dom";
import { ALL_ROLES } from "../constant";
import type { UserFormState, UserRole } from "../type/mock.types";

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

export default function UserFormModal({
  mode,
  initial,
  onSave,
  onClose,
}: {
  mode: "add" | "edit";
  initial: UserFormState;
  onSave: (data: UserFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UserFormState>(initial);
  const [errors, setErrors] = useState<Partial<UserFormState>>({});

  function validate() {
    const e: Partial<UserFormState> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.title.trim()) e.title = "Title is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Enter a valid email.";
    if (!form.contact.trim()) e.contact = "Contact is required.";
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    onSave(form);
  }

  function field(
    label: string,
    key: keyof UserFormState,
    type = "text",
    placeholder = "",
  ) {
    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={label}
          className="text-theme-xs font-medium text-gray-600 dark:text-gray-400"
        >
          {label}
        </label>
        <input
          type={type}
          value={form[key] as string}
          onChange={(e) => {
            setForm((f) => ({ ...f, [key]: e.target.value }));
            setErrors((er) => ({ ...er, [key]: undefined }));
          }}
          placeholder={placeholder}
          className={`px-3 py-2 text-theme-sm rounded-lg border bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 transition dark:bg-white/3 dark:text-gray-200 dark:placeholder-gray-500 ${
            errors[key]
              ? "border-danger focus:ring-danger/30"
              : "border-gray-200 focus:ring-secondary/40 focus:border-secondary dark:border-white/8"
          }`}
        />
        {errors[key] && <span className="text-theme-xs text-danger">{errors[key]}</span>}
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/8 dark:bg-gray-900 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/8">
          <div>
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {mode === "add" ? "Add New User" : "Edit User"}
            </h2>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {mode === "add" ? "Create a new system account." : "Update user details."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {field("Full Name", "name", "text", "e.g. Engr. Juan dela Cruz")}
          {field("Job Title / Position", "title", "text", "e.g. Highway Division Head")}

          {/* Role select */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="role"
              className="text-theme-xs font-medium text-gray-600 dark:text-gray-400"
            >
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as UserRole }))
              }
              className="px-3 py-2 text-theme-sm rounded-lg border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary dark:border-white/8 dark:bg-white/5 dark:text-gray-200 transition"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500">
              {form.role === "Super Admin" &&
                "Manages documents and verifies PDF content."}
              {form.role === "Admin" && "Provincial Engineers and Division Heads."}
              {form.role === "Receiver" && "Updates document receipt and status."}
              {form.role === "Division" &&
                "Division units that submit and track documents."}
            </p>
          </div>

          {field("Email", "email", "email", "e.g. user@peo.gov.ph")}
          {field("Contact Number", "contact", "tel", "e.g. +63 917 123 4567")}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border-white/8 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
          >
            {mode === "add" ? "Add User" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

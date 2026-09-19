import { createPortal } from "react-dom";
import { THIN_SCROLLBAR } from "../../../contant/ThinScrollBar";
import { ALL_ROLES } from "../constant";
import { useEditUserFormModal } from "../hooks/use-edit-user-form-modal";
import type { UserFormState } from "../type/creater-user.type";
import type { UserRole } from "../type/user.type";
import DivisionCombobox from "./DivisionCombobox";

export default function EditUserModal({
  initial,
  onClose,
  userId,
}: {
  initial: UserFormState;
  onClose: () => void;
  userId: string;
}) {
  const {
    form,
    setForm,
    errors,
    setErrors,
    isSubmitting,
    handleSubmit,
  } = useEditUserFormModal(initial, onClose, userId);

  return createPortal(
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/8 dark:bg-gray-900 flex flex-col max-h-[90vh]">
        <form
          autoComplete="off"
          onSubmit={(e) => e.preventDefault()}
          className="contents"
        >
          <input type="hidden" autoComplete="username" name="username" tabIndex={-1} />
          <input type="hidden" autoComplete="new-password" name="password" tabIndex={-1} />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/8">
          <div>
            <h2 className="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              Edit User
            </h2>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Update user details.
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

        <div className={`flex-1 overflow-y-auto px-5 py-5 space-y-4 ${THIN_SCROLLBAR}`}>
          {field("Full Name", "name", {
            required: true,
            placeholder: "e.g. Engr. Juan dela Cruz",
          })}
          {field("Position", "position", {
            placeholder: "e.g. Highway Division Head",
          })}

          <div className="flex flex-col gap-1">
            <label
              htmlFor="role"
              className="text-theme-xs font-medium text-gray-600 dark:text-gray-400"
            >
              Role <span className="text-danger">*</span>
            </label>
            <select
              id="role"
              value={form.role}
              onChange={(e) => {
                const nextRole = e.target.value as UserRole | "";
                setForm((f) => ({
                  ...f,
                  role: nextRole,
                  // Clear division whenever role isn't "Division" so a stale
                  // value can't sneak into the payload while the field is hidden.
                  division: nextRole === "Division" ? f.division : null,
                }));
                setErrors((er) => ({ ...er, role: undefined, division: undefined }));
              }}
              className={`px-3 py-2 text-theme-sm rounded-lg border bg-white text-gray-700 focus:outline-none focus:ring-2 transition dark:bg-white/5 dark:text-gray-200 ${
                errors.role
                  ? "border-danger focus:ring-danger/30"
                  : "border-gray-200 focus:ring-secondary/40 focus:border-secondary dark:border-white/8"
              }`}
            >
              <option value="" disabled>
                Select a role
              </option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {errors.role && (
              <span className="text-theme-xs text-danger">{errors.role}</span>
            )}
            {form.role === "Super Admin" && (
              <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                Manages documents and verifies PDF content.
              </p>
            )}
            {form.role === "Admin" && (
              <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                Provincial Engineers and Division Heads.
              </p>
            )}
            {form.role === "Receiver" && (
              <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                Updates document receipt and status.
              </p>
            )}
            {form.role === "Division" && (
              <p className="text-theme-xs text-gray-400 dark:text-gray-500">
                Division units that submit and track documents.
              </p>
            )}
          </div>

          {form.role === "Division" && (
            <DivisionCombobox
              value={form.division}
              onChange={(division) => {
                setForm((f) => ({ ...f, division }));
                setErrors((er) => ({ ...er, division: undefined }));
              }}
              error={errors.division}
            />
          )}

          {field("Email", "email", {
            type: "email",
            required: true,
            placeholder: "e.g. user@peo.gov.ph",
            autoComplete: "new-password",
            name: "new-username",
          })}
          {field("Contact Number", "contact", {
            type: "tel",
            placeholder: "e.g. +63 917 123 4567",
          })}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border:white/8">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border:white/8 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
        </form>
      </div>
    </div>,
    document.body,
  );

  // ─── Render helpers (presentational only; state/logic lives in the hook) ─

  function field(
    label: string,
    key: keyof UserFormState,
    opts?: { type?: string; placeholder?: string; required?: boolean; autoComplete?: string; name?: string },
  ) {
    const { type = "text", placeholder = "", required = false, autoComplete, name } = opts ?? {};
    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={key}
          className="text-theme-xs font-medium text-gray-600 dark:text-gray-400"
        >
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
        <input
          id={key}
          name={name ?? key}
          type={type}
          value={(form[key] as string) ?? ""}
          onChange={(e) => {
            setForm((f) => ({ ...f, [key]: e.target.value }));
            setErrors((er) => ({ ...er, [key]: undefined }));
          }}
          placeholder={placeholder}
          autoComplete={autoComplete ?? "off"}
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
}

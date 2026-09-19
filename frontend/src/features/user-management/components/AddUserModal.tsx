import { createPortal } from "react-dom";
import { THIN_SCROLLBAR } from "../../../contant/ThinScrollBar";
import { ALL_ROLES } from "../constant";
import { useAddUserFormModal } from "../hooks/use-add-user-form-modal";
import type { UserFormState } from "../type/creater-user.type";
import type { UserRole } from "../type/user.type";
import DivisionCombobox from "./DivisionCombobox";
import UserCredentialsModal from "./UserCredentialsModal";

export default function AddUserModal({
  initial,
  onClose,
}: {
  initial: UserFormState;
  onClose: () => void;
}) {
  const {
    form,
    setForm,
    errors,
    setErrors,
    showPassword,
    setShowPassword,
    createdUser,
    passwordRef,
    isSubmitting,
    handleSubmit,
    handleGeneratePassword,
    handleCopyPassword,
  } = useAddUserFormModal(initial);

  if (createdUser) {
    return (
      <UserCredentialsModal
        email={createdUser.email}
        password={createdUser.password}
        onClose={onClose}
      />
    );
  }

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
              Add New User
            </h2>
            <p className="text-theme-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Create a new system account.
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

          {passwordField()}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 dark:border-white/8">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-theme-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:border-gray-300 dark:border-white/8 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-theme-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving…" : "Add User"}
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

  function passwordField() {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label
            htmlFor="new-user-password"
            className="text-theme-xs font-medium text-gray-600 dark:text-gray-400"
          >
            Password <span className="text-danger">*</span>
          </label>
          <button
            type="button"
            onClick={handleGeneratePassword}
            className="text-theme-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
          >
            Generate password
          </button>
        </div>

        <div className="relative">
          <input
            id="new-user-password"
            name="new-password"
            ref={passwordRef}
            type={showPassword ? "text" : "password"}
            value={form.password ?? ""}
            onChange={(e) => {
              setForm((f) => ({ ...f, password: e.target.value }));
              setErrors((er) => ({ ...er, password: undefined }));
            }}
            placeholder="Temporary password"
            autoComplete="new-password"
            className={`w-full px-3 py-2 pr-[4.5rem] text-theme-sm rounded-lg border bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 transition dark:bg-white/3 dark:text-gray-200 dark:placeholder-gray-500 ${
              errors.password
                ? "border-danger focus:ring-danger/30"
                : "border-gray-200 focus:ring-secondary/40 focus:border-secondary dark:border-white/8"
            }`}
          />

          <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
            {form.password && (
              <button
                type="button"
                onClick={handleCopyPassword}
                aria-label="Copy password"
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
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
            >
              {showPassword ? (
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
                    d="M3.98 8.223A10.477 10.477 0 0A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                  />
                </svg>
              ) : (
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
                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {errors.password && (
          <span className="text-theme-xs text-danger">{errors.password}</span>
        )}
      </div>
    );
  }
}

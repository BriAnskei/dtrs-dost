import Input from "../../../../components/form/input/InputField";
import Modal from "../../../../components/Modal";
import { CopyIcon } from "../../../../icons";
import { ALL_ROLES } from "../../constants";
import { useAddUserFormModal } from "../../hooks/use-add-user-form-modal";
import type { AssignableRole, UserFormState } from "../../types/create-user.type";
import DivisionCombobox from "../DivisionCombobox";
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

  return (
    <Modal
      onClose={onClose}
      closeDisabled={isSubmitting}
      header={
        <>
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
            disabled={isSubmitting}
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
        </>
      }
      body={
        <div className="space-y-4">
          <Input
            size="sm"
            label="Full Name"
            labelRequired
            id="name"
            value={form.name ?? ""}
            onChange={(e) => {
              setForm((f) => ({ ...f, name: e.target.value }));
              setErrors((er) => ({ ...er, name: undefined }));
            }}
            placeholder="e.g. Juan dela Cruz"
            error={errors.name}
          />
          <Input
            size="sm"
            label="Position"
            labelOptional
            id="position"
            value={form.position ?? ""}
            onChange={(e) => {
              setForm((f) => ({ ...f, position: e.target.value }));
              setErrors((er) => ({ ...er, position: undefined }));
            }}
            placeholder="e.g. Highway Division Head"
            error={errors.position}
          />

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
                const nextRole = e.target.value as AssignableRole | "";
                setForm((f) => ({
                  ...f,
                  role: nextRole,
                  // Clear division whenever role isn't "Division" so a stale
                  // value can't sneak into the payload while the field is hidden.
                  division: nextRole === "Division" ? f.division : undefined,
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
                setForm((f) => ({ ...f, division: division ?? undefined }));
                setErrors((er) => ({ ...er, division: undefined }));
              }}
              error={errors.division}
            />
          )}

          <Input
            size="sm"
            type="email"
            label="Email"
            labelRequired
            id="email"
            name="new-username"
            autoComplete="new-password"
            value={form.email ?? ""}
            onChange={(e) => {
              setForm((f) => ({ ...f, email: e.target.value }));
              setErrors((er) => ({ ...er, email: undefined }));
            }}
            placeholder="e.g. user@peo.gov.ph"
            error={errors.email}
          />
          <Input
            size="sm"
            type="tel"
            label="Contact Number"
            labelOptional
            id="contact"
            value={form.contact ?? ""}
            onChange={(e) => {
              setForm((f) => ({ ...f, contact: e.target.value }));
              setErrors((er) => ({ ...er, contact: undefined }));
            }}
            placeholder="e.g. 0917 123 4567"
            error={errors.contact}
          />

          <Input
            type="password"
            size="sm"
            label="Password"
            labelRequired
            labelAction={
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="text-theme-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
              >
                Generate password
              </button>
            }
            trailingAction={
              form.password ? (
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  aria-label="Copy password"
                  className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors"
                >
                  <CopyIcon className="size-4" />
                </button>
              ) : undefined
            }
            id="new-user-password"
            name="new-password"
            ref={passwordRef}
            autoComplete="new-password"
            placeholder="Temporary password"
            error={errors.password}
            value={form.password ?? ""}
            onChange={(e) => {
              setForm((f) => ({ ...f, password: e.target.value }));
              setErrors((er) => ({ ...er, password: undefined }));
            }}
          />
        </div>
      }
      footer={
        <>
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
        </>
      }
    />
  );
}

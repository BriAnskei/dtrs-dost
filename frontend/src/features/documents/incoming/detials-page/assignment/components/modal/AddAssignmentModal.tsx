import { Building2, GitBranch, type LucideIcon, X } from "lucide-react";
import { useId } from "react";
import Modal from "../../../../../../../components/Modal";
import DivisionCombobox from "../../../../../../user-management/components/DivisionCombobox";
import { OfficeTypeEnum } from "../../../../enum/office-type.enum";
import NoticeOfActionEditor from "../../../../shared/component/NoticeOfActionEditor";
import {
  errorClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from "../../../../shared/detial-panel-form-style-constant";
import { useAddAssignmentModal } from "../../hooks/use-add-assignment-modal";
import {
  type RoutedDivisionOption,
  useRoutedDivisionSearch,
} from "../../hooks/user-routed-division-search";

interface AddAssignmentModalProps {
  incomingDocumentId: string;
  onClose: () => void;
}

const TARGETS: readonly {
  value: OfficeTypeEnum;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    value: OfficeTypeEnum.MAIN,
    label: "Main office",
    hint: "Handled by the main office. No division needed.",
    icon: Building2,
  },
  {
    value: OfficeTypeEnum.DIVISION,
    label: "Division",
    hint: "Assign to a division this document is routed to.",
    icon: GitBranch,
  },
];

/**
 * Adds notices of action from the Assignments tab. Mount it only while open:
 * unmounting resets every field. State and the API call live in
 * `useAddAssignmentModal`; this file is layout only.
 */
export default function AddAssignmentModal({
  incomingDocumentId,
  onClose,
}: AddAssignmentModalProps) {
  const idPrefix = useId();
  const groupName = `${idPrefix}-office-type`;

  const m = useAddAssignmentModal({ incomingDocumentId, onClose });
  const { drafts } = m;
  const count = drafts.notices.length;

  const header = (
    <>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Add notice of action
        </h2>
        <p className="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
          Choose who it's for, then write what they need to do.
        </p>
      </div>
      <button
        type="button"
        onClick={m.requestClose}
        disabled={m.isSubmitting}
        aria-label="Close"
        className="ml-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:opacity-50 dark:hover:bg-white/5 dark:hover:text-gray-200"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );

  const body = (
    <div className="space-y-6">
      {m.discardPrompt && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-warning-200 bg-warning-50 px-4 py-3 dark:border-warning-500/30 dark:bg-warning-500/10"
        >
          <p className="text-theme-sm text-warning-700 dark:text-warning-400">
            You have unsaved changes. Discard them?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={m.keepEditing}
              className={`${secondaryButton} !px-3 !py-1.5`}
            >
              Keep editing
            </button>
            <button
              type="button"
              onClick={m.discard}
              className={`${primaryButton} !px-3 !py-1.5`}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* 1. Target. Native radios: arrow keys, grouping and state come for free.
          Nothing is preselected, because this decides who is responsible. */}
      <fieldset disabled={m.isSubmitting}>
        <legend className={labelClass}>
          Assign to <span className="text-error-500">*</span>
        </legend>
        <div className="mt-1 grid gap-3 sm:grid-cols-2">
          {TARGETS.map(({ value, label, hint, icon: Icon }) => {
            const id = `${idPrefix}-${value}`;
            return (
              <div key={value}>
                <input
                  id={id}
                  type="radio"
                  name={groupName}
                  value={value}
                  checked={m.officeType === value}
                  onChange={() => m.selectOffice(value)}
                  aria-describedby={`${id}-hint`}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className="flex h-full cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 transition hover:bg-gray-50 peer-checked:border-primary peer-checked:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-secondary/40 peer-disabled:cursor-not-allowed peer-disabled:opacity-60 dark:border-white/8 dark:hover:bg-white/3"
                >
                  <Icon
                    className="mt-0.5 h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {label}
                    </span>
                    <span
                      id={`${id}-hint`}
                      className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400"
                    >
                      {hint}
                    </span>
                  </span>
                </label>
              </div>
            );
          })}
        </div>
        {m.officeError && (
          <p role="alert" className={errorClass}>
            {m.officeError}
          </p>
        )}
      </fieldset>

      {m.officeType === OfficeTypeEnum.DIVISION && (
        <DivisionCombobox<RoutedDivisionOption, string>
          id={`${idPrefix}-division`}
          value={m.division?.division_name}
          useSearch={useRoutedDivisionSearch}
          searchScope={incomingDocumentId}
          requireSelection
          required
          onSelect={m.selectDivision}
          error={m.divisionError}
          disabled={m.isSubmitting}
        />
      )}

      {/* 3. Notices, once the target is settled. */}
      {m.showEditor ? (
        <div>
          <p className={labelClass}>Notices of action</p>
          <div className="mt-1">
            <NoticeOfActionEditor
              idPrefix={idPrefix}
              notices={drafts.notices}
              noticeErrors={drafts.noticeErrors}
              lastAddedKey={drafts.lastAddedKey}
              canAdd={drafts.canAdd}
              max={drafts.max}
              disabled={m.isSubmitting}
              onAdd={drafts.add}
              onUpdate={drafts.update}
              onRemove={drafts.remove}
            />
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-theme-xs text-gray-500 dark:bg-white/3 dark:text-gray-400">
          {m.officeType === OfficeTypeEnum.DIVISION
            ? "Pick a division to start writing notices."
            : "Choose where this goes to start writing notices."}
        </p>
      )}
    </div>
  );

  const footer = (
    <>
      <button
        type="button"
        onClick={m.requestClose}
        disabled={m.isSubmitting}
        className={secondaryButton}
      >
        Cancel
      </button>
      <button type="submit" disabled={m.isSubmitting} className={primaryButton}>
        {m.isSubmitting
          ? "Adding…"
          : count > 0
            ? `Add ${count} ${count === 1 ? "notice" : "notices"}`
            : "Add notices"}
      </button>
    </>
  );

  return (
    <Modal
      size="lg"
      onClose={m.requestClose}
      closeDisabled={m.isSubmitting}
      onSubmit={() => void m.submit()}
      header={header}
      body={body}
      footer={footer}
    />
  );
}

import clsx from "clsx";
import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { forwardRef, useId, useState } from "react";
import { EyeCloseIcon, EyeIcon } from "../../../icons";

export type InputSize = "sm" | "md" | "lg";

interface SizeStyle {
  /** Input padding / height / text size. */
  input: string;
  /** Eye icon size. */
  icon: string;
  /** Right padding that clears a shown eye toggle. */
  togglePr: string;
  /** Right padding that clears an eye toggle + a trailingAction button. */
  actionPr: string;
  /** Neutral border / focus ring / dark / shadow tokens. */
  neutral: string;
  /** Error-state border / ring tokens (string message → this styling + message). */
  error: string;
  /** Success-state border / ring tokens. */
  success: string;
}

/**
 * Two visual families live in the app today:
 *  - `md` / auth: the canonical `InputField` look (`shadow-theme-xs`,
 *    `bg-gray-900` dark, `brand-*` focus rings, `ring-3`). Used by SignInForm /
 *    ResetPasswordForm.
 *  - `sm` / modal: the inline modal-field look (`bg-white/3` dark,
 *    `secondary` focus rings, `ring-2`, no shadow). Used by the user-magement
 *    modals.
 * Each size carries the full style so swapping a field over never regroups its
 * dark-mode / focus tokens.
 */
const SIZE_CONFIG: Record<InputSize, SizeStyle> = {
  sm: {
    input: "px-3 py-2 text-theme-sm",
    icon: "size-4",
    togglePr: "pr-9",
    actionPr: "pr-16",
    neutral:
      "border-gray-200 focus:border-secondary focus:ring-secondary/40 dark:border-white/[0.08] dark:bg-white/3 dark:text-gray-200 focus:ring-2",
    error:
      "border-danger focus:border-danger focus:ring-danger/30 dark:border-error-500 dark:focus:border-error-800 dark:text-error-400",
    success:
      "border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500",
  },
  md: {
    input: "h-11 px-4 py-2.5 text-sm",
    icon: "size-5",
    togglePr: "pr-10",
    actionPr: "pr-16",
    neutral:
      "border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:ring-3 shadow-theme-xs",
    error:
      "border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800",
    success:
      "border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500 dark:focus:border-success-800",
  },
  lg: {
    input: "h-12 px-4 py-3 text-theme-md",
    icon: "size-5",
    togglePr: "pr-12",
    actionPr: "pr-16",
    neutral:
      "border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 focus:ring-3 shadow-theme-xs",
    error:
      "border-error-500 focus:border-error-300 focus:ring-error-500/20 dark:text-error-400 dark:border-error-500 dark:focus:border-error-800",
    success:
      "border-success-500 focus:border-success-300 focus:ring-success-500/20 dark:text-success-400 dark:border-success-500 dark:focus:border-success-800",
  },
};

const DISABLED_CLASS =
  "text-gray-500 border-gray-300 opacity-40 bg-gray-100 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";

const baseInputClass =
  "w-full rounded-lg border appearance-none placeholder:text-gray-400 focus:outline-hidden dark:placeholder:text-white/30 disabled:cursor-not-allowed";

const baseToggleClass =
  "absolute inset-y-0 right-1 flex items-center p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5 dark:hover:text-gray-200 transition-colors";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "error" | "success"> {
  /** Visual family / size. `sm` = modal fields, `md` = auth fields. Default "md". */
  size?: InputSize;
  /** Optional field label rendered above the input. Omit for label-less fields. */
  label?: string;
  /** Show the required indicator ("*") on the label. */
  labelRequired?: boolean;
  /** Extra classes for the label element. */
  labelClassName?: string;
  /** Optional top-right action rendered with the label, e.g. a "Generate password" link. */
  labelAction?: ReactNode;
  /** Show the "(optional)" hint on the label. */
  labelOptional?: boolean;
  /** `true` = error styling only; a `string` = styling + message rendered below. */
  error?: string | boolean;
  /** Helper text below the field (ignored when an `error` message is set). */
  hint?: string;
  /** Success styling. */
  success?: boolean;
  /** Optional leading visual (e.g. a search icon). Adds left padding automatically. */
  leadingIcon?: ReactNode;
  /** Optional trailing action, e.g. a "Generate password" link. Rendered before the eye toggle. */
  trailingAction?: ReactNode;
  /** Show the show/hide eye toggle for password fields. Default: true when `type="password"`. */
  showPasswordToggle?: boolean;
  /** Controlled visibility (uncontrolled by default). */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /**
   * When `type="password"`, render the field as a real `type="text"` input
   * and fake the dot-masking with `-webkit-text-security` (falling back to
   * the `text-security-disc` web font for non-WebKit browsers) instead of
   * ever setting `type="password"` on the DOM node.
   *
   * Chrome/Edge's "Save password?" prompt is keyed off `input[type="password"]`
   * inside a submitted `<form>` — it doesn't care what the field is named or
   * what autocomplete hint it has. Fields using this flag never trigger it,
   * because the browser never sees a password input.
   *
   * Use this for admin-generated / one-off credentials that aren't the
   * current browser user's own login (e.g. AddUserModal, ResetPasswordModal)
   * — not for the actual sign-in form, where saving *is* wanted.
   *
   * Trade-off: opts the field out of any password-manager-adjacent browser
   * protections (leaked-password warnings, etc.) and it won't be announced
   * as a password field to screen readers. Default: false.
   */
  noBrowserPassword?: boolean;
}

interface MaskStyle extends CSSProperties {
  WebkitTextSecurity?: "none" | "disc" | "circle" | "square";
}

/**
 * Unified, configurable input — single shell for every form field in the app:
 * plain text (no label, leading search icon → table toolbars), labelled auth
 * fields, and password fields with a built-in show/hide eye toggle.
 *
 * Replaces the duplicated eye-toggle blocks across SignInForm,
 * ResetPasswordForm, AddUserModal, VerifyPasswordStep, DirectResetStep and
 * DeactivateUserModal with one component. All of those previously inlined their
 * own `<EyeIcon>`/`<EyeCloseIcon>` or hand-rolled SVG paths; this component
 * normalises them to the shared icons from `src/icons`.
 *
 * Configuration surface mirrors `TableShell` — typed props with JSDoc and
 * sensible defaults, so callers describe intent instead of restyling markup.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    type = "text",
    size = "md",
    label,
    labelRequired = false,
    labelOptional = false,
    labelClassName,
    labelAction,
    error,
    hint,
    success = false,
    leadingIcon,
    trailingAction,
    showPasswordToggle,
    visible: controlledVisible,
    onVisibleChange,
    noBrowserPassword = false,
    id,
    className,
    disabled,
    autoComplete,
    style,
    ...rest
  } = props;

  const generatedId = useId();
  const inputId = id ?? `input-${generatedId}`;
  const toggleId = `${inputId}-toggle`;

  const isControlled = controlledVisible !== undefined;
  const [internalVisible, setInternalVisible] = useState(false);
  const showPassword = isControlled ? controlledVisible! : internalVisible;

  const withToggle = type === "password" && showPasswordToggle !== false;
  const hasError = Boolean(error);
  const errorMessage = typeof error === "string" ? error : undefined;

  // "Fake" password mode: never emit type="password" to the DOM, so Chrome/
  // Edge never flag the field as a credential and offer to save it.
  const isFakePassword = type === "password" && noBrowserPassword;

  const domType = isFakePassword ? "text" : withToggle && showPassword ? "text" : type;

  const maskStyle: MaskStyle | undefined = isFakePassword
    ? {
        WebkitTextSecurity: showPassword ? "none" : "disc",
        fontFamily: showPassword ? undefined : "text-security-disc",
      }
    : undefined;

  const cfg = SIZE_CONFIG[size];

  let stateClass: string;
  if (disabled) {
    stateClass = DISABLED_CLASS;
  } else if (hasError) {
    stateClass = cfg.error;
  } else if (success) {
    stateClass = cfg.success;
  } else {
    stateClass = cfg.neutral;
  }

  const inputClasses = [
    baseInputClass,
    cfg.input,
    leadingIcon ? "pl-9" : "pl-3",
    withToggle ? (trailingAction ? cfg.actionPr : cfg.togglePr) : "",
    stateClass,
    className,
  ].join(" ");

  const resolvedAutoComplete =
    autoComplete ??
    (isFakePassword
      ? "off" // no "new-password"/"current-password" hint once it's not type=password
      : type === "password"
        ? "new-password"
        : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && labelAction ? (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className={clsx(
              "mb-0 block text-theme-xs font-medium text-gray-600 dark:text-gray-400",
              labelClassName,
            )}
          >
            {label}
            {labelRequired && <span className="text-danger"> *</span>}
          </label>
          {labelAction}
        </div>
      ) : label ? (
        <label
          htmlFor={inputId}
          className={clsx(
            "mb-0 block text-theme-xs font-medium text-gray-600 dark:text-gray-400",
            labelClassName,
          )}
        >
          {label}
          {labelRequired && <span className="text-danger"> *</span>}
        </label>
      ) : null}

      <div className="relative">
        {leadingIcon && (
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
            {leadingIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={domType}
          style={{ ...maskStyle, ...style }}
          autoComplete={resolvedAutoComplete}
          className={inputClasses}
          disabled={disabled}
          {...rest}
        />

        {withToggle && (
          <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
            {trailingAction}
            <button
              type="button"
              id={toggleId}
              onClick={() => {
                if (isControlled) {
                  onVisibleChange?.(!showPassword);
                } else {
                  setInternalVisible(!showPassword);
                }
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              aria-controls={inputId}
              className={baseToggleClass}
            >
              {showPassword ? (
                <EyeIcon className={`${cfg.icon} fill-gray-500 dark:fill-gray-400`} />
              ) : (
                <EyeCloseIcon
                  className={`${cfg.icon} fill-gray-500 dark:fill-gray-400`}
                />
              )}
            </button>
          </div>
        )}
      </div>

      {hasError && errorMessage && (
        <span className="text-theme-xs text-danger">{errorMessage}</span>
      )}
      {!hasError && hint && (
        <span className="text-theme-xs text-gray-500 dark:text-gray-400">{hint}</span>
      )}
    </div>
  );
});

Input.displayName = "Input";
export default Input;

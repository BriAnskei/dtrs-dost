/* Shared form/button classes for the assign-division modal and the division assignments panel. */

export const inputClass =
  "w-full rounded-lg border bg-white px-3 text-theme-sm text-gray-800 placeholder:text-gray-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:opacity-60 dark:bg-white/3 dark:text-white/90 dark:placeholder:text-gray-500";

export const inputBorder = (hasError: boolean) =>
  hasError ? "border-error-500" : "border-gray-200 dark:border-white/8";

export const labelClass =
  "block text-theme-xs font-medium text-gray-700 dark:text-gray-300";

export const errorClass = "mt-1 text-theme-xs text-error-500";

export const secondaryButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-theme-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/8 dark:bg-white/3 dark:text-gray-200 dark:hover:bg-white/5";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-theme-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:ring-offset-gray-900";

/* Translucent gray reads correctly on both light and dark surfaces. */
export const SKELETON_BASE = "rgba(156, 163, 175, 0.25)";
export const SKELETON_HIGHLIGHT = "rgba(156, 163, 175, 0.4)";

export const BACK_PATH = "/incoming";

export const cardClass =
  "rounded-2xl border border-gray-200 bg-white p-5 dark:border-white/8 dark:bg-white/3 sm:p-6";

export const eyebrowClass =
  "text-theme-xs font-semibold uppercase tracking-wider text-primary dark:text-secondary";

export const backLinkClass =
  "inline-flex items-center gap-1.5 rounded text-theme-sm font-medium text-gray-500 transition hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 dark:text-gray-400 dark:hover:text-gray-200";

export const tabDomId = (id: string) => `incoming-details-tab-${id}`;
export const panelDomId = (id: string) => `incoming-details-panel-${id}`;

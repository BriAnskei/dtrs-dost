import { useEffect } from "react";
import { useBlocker } from "react-router";

/**
 * Prevents accidental navigation away from the current page when an async
 * operation is in progress.
 *
 * Combines two layers of protection:
 *
 *  - `beforeunload` — browser-native dialog on refresh, tab close, or
 *    address-bar navigation. The user cannot customise its text; the browser
 *    shows a standard "Are you sure you want to leave?" prompt.
 *
 *  - `useBlocker` (React Router v7) — SPA-level confirmation on in-app
 *    navigations: <Link> clicks, browser back/forward buttons, and
 *    programmatic `navigate()` calls.
 *
 * Pass `true` while an extraction / upload is running, `false` otherwise.
 */
export function useExitConfirmation(when: boolean) {
  // Browser-level: refresh, tab close, address-bar navigation.
  useEffect(() => {
    if (!when) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  // SPA-level: React Router navigations (links, back/forward, programmatic).
  useBlocker(when);
}

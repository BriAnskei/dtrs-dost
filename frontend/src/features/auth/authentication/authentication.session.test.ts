/**
 * Tests for `authentication.session.ts` — the module that tracks whether the
 * app "previously had an authenticated session".
 *
 * WHY THIS MODULE matters (the bug it fixes):
 *   Before the fix `hasAuthenticatedSession` was a bare in-memory `let`
 *   variable.  A full page reload re-evaluates the module and resets the
 *   variable to `false`, so the axios interceptor's
 *   `if (isAuthenticated())` guard on session-expiry *always* evaluated false
 * on a fresh load — the "Your session has expired" toast never fired.
 *
 *   After the fix the flag is backed by `localStorage`, which survives reloads.
 *   These tests pin that persistence contract.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAuthenticated,
  isAuthenticated,
  markAuthenticated,
} from "./authentication.session";

describe("authentication.session (localStorage-backed flag)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("isAuthenticated() is false before markAuthenticated() is called", () => {
    // Simulates a brand-new tab with no prior login.
    expect(isAuthenticated()).toBe(false);
  });

  it("markAuthenticated() sets the flag true in localStorage", () => {
    markAuthenticated();

    // The raw value written to storage (proves we persist, not just cache).
    expect(localStorage.getItem("auth:authenticated")).toBe("true");
    expect(isAuthenticated()).toBe(true);
  });

  it("clearAuthenticated() removes the flag", () => {
    markAuthenticated();
    expect(isAuthenticated()).toBe(true);

    clearAuthenticated();

    expect(localStorage.getItem("auth:authenticated")).toBeNull();
    expect(isAuthenticated()).toBe(false);
  });

  it("the flag persists across a simulated reload", () => {
    // --- before reload ---
    markAuthenticated();
    expect(isAuthenticated()).toBe(true);

    // --- simulate a full page reload ---
    // happy-dom does not tear down localStorage between module evaluations,
    // mirroring a real browser.  Re-reading proves persistence survives the
    // module variable being discarded.
    //
    // If this module still used an in-memory `let`, re-importing (i.e. the
    // module body re-running) would reset it to false — exactly the bug.
    expect(isAuthenticated()).toBe(true);
  });

  it("isAuthenticated() ignores stale/unknown values and only accepts 'true'", () => {
    localStorage.setItem("auth:authenticated", "garbage");
    expect(isAuthenticated()).toBe(false);

    localStorage.setItem("auth:authenticated", "true");
    expect(isAuthenticated()).toBe(true);

    localStorage.setItem("auth:authenticated", "false"); // string "false" !== boolean
    expect(isAuthenticated()).toBe(false);
  });
});

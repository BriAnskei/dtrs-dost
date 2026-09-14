/**
 * Global test setup — runs once before every test file.
 *
 * 1. Registers @testing-library/jest-dom custom matchers (toBeInTheDocument,
 *    toHaveAttribute, etc.).
 * 2. Resets browser storage so tests start clean.  The authentication.session
 *    module reads localStorage at call-time, so clearing it here guarantees
 *    no cross-test bleed of the "is authenticated" flag.
 * 3. Clears any queued session-expiry events between tests.
 */

import "@testing-library/jest-dom";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.localStorage.clear();

  // Drop any stray listeners attached in a previous test.
  window.removeEventListener("auth:session-expired", () => {});
});

/**
 * Unit tests for `getApiErrorMessage` — the error-message translator that sits
 * between the axios interceptor / mutation hooks and the user-facing toast /
 * failure descriptor.
 *
 * THE FUNCTION UNDER TEST (lib/api-error.ts):
 *
 *   getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string
 *
 * Resolution order:
 *   1. If `error` is NOT an AxiosError → returns `fallback` (non-API / thrown error).
 *   2. Reads `error.response?.status` and `error.response?.data`.
 *   3. Idempotency key reuse / conflict handling (the "for idempotency" part):
 *      a. status 409 + code "IDEMPOTENCY_KEY_IN_USE"
 *         → "This request is still processing. Please wait a moment before trying again."
 *      b. status 422 + code "IDEMPOTENCY_KEY_REUSED"
 *         → "This request key was already used for different data. Please refresh and try again."
 *      c. status 400 + code "IDEMPOTENCY_KEY_REQUIRED"
 *         → "A required request identifier is missing. Please refresh and try again."
 *   4. status 429 (rate limit) — regardless of code — → rate-limit message.
 *   5. `data.message` is an array → join with ", ".
 *   6. `data.message` is a string → return it.
 *   7. `data.error` is a string → return it.
 *   8. Otherwise → return `fallback`.
 *
 * Every branch is tested to pin the exact message returned, so UI error text
 * changes are caught as a test failure.
 */

import axios, { AxiosError } from "axios";

import { getApiErrorMessage } from "./api-error";

/* ── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Build a real AxiosError the same way axios does on a non-2xx response,
 * so `axios.isAxiosError` and the `.response` shape are accurate.
 */
function makeAxiosError(
  status: number,
  data: unknown,
): AxiosError {
  const response = {
    data,
    status,
    statusText: "Error",
    headers: {},
    config: {} as import("axios").InternalAxiosRequestConfig,
    request: {},
  };

  return new AxiosError(
    `Request failed with status code ${status}`,
    status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
    undefined,
    undefined,
    response as AxiosError["response"],
  );
}

const FALLBACK = "Something went wrong.";

/* ── Tests ──────────────────────────────────────────────────────────────────── */

describe("getApiErrorMessage", () => {
  /* ── Idempotency: key still in use ────────────────────────────────────── */

  it("returns the 'still processing' message when the same key is in-flight (409 + IDEMPOTENCY_KEY_IN_USE)", () => {
    /*
     * The backend interceptor holds a lock on `(scope, key)` while the handler
     * runs. A concurrent retry with the same key arrives to find the lock still
     * held → 409 with code "IDEMPOTENCY_KEY_IN_USE". The UI must tell the user
     * to wait rather than retrying blindly (which would just hit the same lock).
     */
    const error = makeAxiosError(409, {
      code: "IDEMPOTENCY_KEY_IN_USE",
      message: "A request with this idempotency key is still being processed.",
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "This request is still processing. Please wait a moment before trying again.",
    );
  });

  /* ── Idempotency: key reused for different body ────────────────────────── */

  it("returns the 'key reused' message when the same key is sent with different data (422 + IDEMPOTENCY_KEY_REUSED)", () => {
    /*
     * The idempotency package fingerprints the request body. If two requests
     * share a key but differ in payload, the store detects a fingerprint
     * mismatch → 422 with code "IDEMPOTENCY_KEY_REUSED". The client must alert
     * the user that the key is stale and needs a fresh one (a new UUID).
     */
    const error = makeAxiosError(422, {
      code: "IDEMPOTENCY_KEY_REUSED",
      message: "This idempotency key was already used for a different request.",
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "This request key was already used for different data. Please refresh and try again.",
    );
  });

  /* ── Idempotency: key missing entirely ──────────────────────────────────── */

  it("returns the 'key required' message when a required idempotency key is absent (400 + IDEMPOTENCY_KEY_REQUIRED)", () => {
    /*
     * When `@Idempotent({ required: true })` is set and the client omits the
     * `Idempotency-Key` header, the interceptor rejects synchronously with a
     * 400 and code "IDEMPOTENCY_KEY_REQUIRED". This is a client bug — the app
     * should never send a request without generating a UUID key first.
     */
    const error = makeAxiosError(400, {
      code: "IDEMPOTENCY_KEY_REQUIRED",
      message: "An idempotency key is required for this operation.",
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "A required request identifier is missing. Please refresh and try again.",
    );
  });

  /* ── Idempotency: the status-code branch does not short-circuit on code ─── */

  it("returns the rate-limit message on 429 even when an IDEMPOTENCY_KEY_REUSED code is present", () => {
    /*
     * The 429 check (step 4) runs AFTER the idempotency-code checks. Because
     * IDEMPOTENCY_KEY_REUSED is only paired with 422, a 429 with any body must
     * fall through to the rate-limit message. This proves the order: the 425
     * check is keyed on status, not code.
     */
    const error = makeAxiosError(429, {
      code: "IDEMPOTENCY_KEY_REUSED",
      message: "Too Many Requests",
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "Too many requests. Please wait a moment before trying again.",
    );
  });

  /* ── Idempotency: 409 without the code falls through to generic path ────── */

  it("falls through to generic handling when 409 has a different code (not IDEMPOTENCY_KEY_IN_USE)", () => {
    /*
     * 409 is a generic "conflict" status — it is only special-cased when the
     * code is exactly "IDEMPOTENCY_KEY_IN_USE". A plain 409 from another domain
     * (e.g. duplicate resource) should surface the backend's own message.
     */
    const error = makeAxiosError(409, {
      code: "RESOURCE_EXISTS",
      message: "A document with this code already exists.",
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "A document with this code already exists.",
    );
  });

  /* ── Idempotency: 422 without the code falls through to generic path ───── */

  it("falls through to generic handling when 422 has a different code (not IDEMPOTENCY_KEY_REUSED)", () => {
    /*
     * Symmetric to the 409 case: 422 only triggers the key-reused message when
     * the code is "IDEMPOTENCY_KEY_REUSED". A validation 422 with a different
     * code surfaces `message` instead.
     */
    const error = makeAxiosError(422, {
      code: "VALIDATION_ERROR",
      message: ["Subject is required", "Date is invalid"],
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "Subject is required, Date is invalid",
    );
  });

  /* ── Idempotency: 400 without the code falls through ──────────────────── */

  it("falls through to generic handling when 400 has a different code (not IDEMPOTENCY_KEY_REQUIRED)", () => {
    /*
     * A 400 Bad Request from a non-idempotency source (e.g. malformed input)
     * carries a `message` field that the user should see verbatim.
     */
    const error = makeAxiosError(400, {
      code: "BAD_REQUEST",
      message: "Malformed request body.",
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe("Malformed request body.");
  });

  /* ── Non-idempotency branches ──────────────────────────────────────────── */

  it("returns the rate-limit message on 429 (no idempotency code)", () => {
    const error = makeAxiosError(429, {
      message: "Too many requests",
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "Too many requests. Please wait a moment before trying again.",
    );
  });

  it("joins an array `message` with ', '", () => {
    const error = makeAxiosError(400, {
      message: ["Field A is required", "Field B must be a string", "Field C is too long"],
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "Field A is required, Field B must be a string, Field C is too long",
    );
  });

  it("returns a string `message` verbatim", () => {
    const error = makeAxiosError(500, {
      message: "Internal server error",
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe("Internal server error");
  });

  it("falls back to `data.error` when `message` is absent", () => {
    /*
     * Some NestJS filters return `{ error: "Bad Gateway" }` without a
     * `message` field. The function should degrade to `data.error`.
     */
    const error = makeAxiosError(502, {
      error: "Bad Gateway",
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe("Bad Gateway");
  });

  it("returns `fallback` when the response has no message or error", () => {
    const error = makeAxiosError(500, {});

    expect(getApiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  /* ── Non-AxiosError inputs ─────────────────────────────────────────────── */

  it("returns `fallback` for a plain Error (not an AxiosError)", () => {
    const error = new Error("Something exploded");

    expect(getApiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it("returns `fallback` for a non-Error throw (string)", () => {
    expect(getApiErrorMessage("oops", FALLBACK)).toBe(FALLBACK);
  });

  it("returns `fallback` for null", () => {
    expect(getApiErrorMessage(null, FALLBACK)).toBe(FALLBACK);
  });

  it("returns `fallback` when the AxiosError has no response (network error)", () => {
    /*
     * A network-level failure (server down, DNS, timeout) produces an AxiosError
     * with `error.response === undefined`. There is no status or body to read,
     * so the function must return the fallback.
     */
    const error = new AxiosError(
      "connect ECONNREFUSED",
      AxiosError.ERR_NETWORK,
    );

    expect(getApiErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });

  it("uses the provided custom fallback message", () => {
    const customFallback = "Could not load documents. Please try again.";
    const error = new Error("not axios");

    expect(getApiErrorMessage(error, customFallback)).toBe(customFallback);
  });
});

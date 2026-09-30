/**
 * Unit tests for `hasPermission` — the atomic predicate that every
 * authorization check in the app eventually funnels through.
 *
 *   hasPermission(permissions, key)
 *
 * It reads a single boolean flag out of a `Record<string, boolean>` (or
 * `null`/`undefined`).  The return contract is intentionally strict:
 *   - `true`  → caller is allowed
 *   - anything else (false, undefined, missing key) → denied
 *
 * This strictness matters because the backend may send `null` for a
 * permission set the user doesn't have at all.  We must never accidentally
 * grant access when the data is absent.
 */

import { describe, expect, it } from "vitest";
import { hasPermission } from "./has-permission";

describe("hasPermission", () => {
  it("returns true when the flag is explicitly `true`", () => {
    const perms = { view: true, edit: false };
    expect(hasPermission(perms, "view")).toBe(true);
  });

  it("returns false when the flag is explicitly `false`", () => {
    const perms = { view: true, edit: false };
    expect(hasPermission(perms, "edit")).toBe(false);
  });

  it("returns false when the flag is `undefined` (key missing)", () => {
    const perms = { view: true };
    expect(hasPermission(perms, "delete")).toBe(false);
  });

  it("returns false when the permissions object is `null`", () => {
    expect(hasPermission(null, "view")).toBe(false);
  });

  it("returns false when the permissions object is `undefined`", () => {
    expect(hasPermission(undefined, "view")).toBe(false);
  });

  it("coerces the key via `keyof` but treats only `=== true` as granted", () => {
    /*
     * Even if a buggy backend sends a truthy non-boolean (e.g. "yes" or 1),
     * we must NOT treat it as granted — the contract is `=== true` only.
     * This prevents privilege escalation through malformed claims.
     */
    const perms = { view: "yes" as unknown as boolean };
    expect(hasPermission(perms, "view")).toBe(false);
  });
});

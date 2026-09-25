/**
 * Tests for `mapUserResponseToSystemUser` / `mapUsersResponseToSystemUsers` —
 * the pure functions that translate the raw API response shape into the
 * `SystemUser` view-model the table and modals consume.
 *
 * These mappers are the ONLY code that knows about both `UserWithRelationResponse`
 * (API) and `SystemUser` (UI). They sit on the read path of the infinite-scroll
 * pipeline (`useUsers → mapUsersResponseToSystemUsers → useUserManagementTable`),
 * so a bug here silently corrupts every row in the table.
 *
 * NO MOCKS — these are pure functions. We pass in fixture data and assert on the
 * output shape.
 */

import { describe, expect, it } from "vitest";
import { NO_VALUE_PLACEHOLDER, type UserWithRelationResponse } from "../types/user.type";
import {
  mapUserResponseToSystemUser,
  mapUsersResponseToSystemUsers,
} from "./mapUserResponseToSystemUser";

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * A complete API user record with every field populated — exercises every
 * mapping branch.
 */
const FULL_USER: UserWithRelationResponse = {
  id: "u-100",
  full_name: "Alice Reyes",
  position: "Regional Director",
  email: "alice.reyes@example.gov.ph",
  division_name: "NCR Division",
  role: "admin",
  contact: "09171234567",
  created_at: "2025-03-17T14:30:00.000Z",
};

/**
 * A user with optional fields missing (`position`, `contact`, `division_name`)
 * and a role string that must be translated via `mapApiRoleToDisplayRole`.
 */
const MINIMAL_USER: UserWithRelationResponse = {
  id: "u-200",
  full_name: "Bob Santos",
  email: "bob@example.gov.ph",
  role: "receiver_officer",
  created_at: "2025-01-02T09:30:00.000Z",
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("mapUserResponseToSystemUser", () => {
  it("maps all fields when every API field is present", () => {
    const result = mapUserResponseToSystemUser(FULL_USER);

    expect(result).toEqual({
      id: "u-100",
      name: "Alice Reyes",
      position: "Regional Director",
      role: "Admin", // role string "admin" → display role "Admin"
      email: "alice.reyes@example.gov.ph",
      contact: "09171234567",
      divisionName: "NCR Division",
      createtAt: expect.any(String), // localized date string
    });
  });

  it("formats created_at as a localized date string", () => {
    const result = mapUserResponseToSystemUser(FULL_USER);
    // new Date("2025-03-17T14:30:00.000Z").toLocaleDateString(undefined, {...})
    // yields something like "Mar 17, 2025". We assert the shape, not locale.
    expect(result.createtAt).toMatch(/2025/);
    expect(result.createtAt).toMatch(/Mar/i);
  });

  it("falls back to NO_VALUE_PLACEHOLDER for missing optional fields", () => {
    /*
     * position, contact, and division_name are all optional in the API.
     * The UI should show "—" instead of "undefined" for these.
     * `divisionName` stays `undefined` (no placeholder) because the table
     * conditionally renders it only when the role is "Division".
     */
    const result = mapUserResponseToSystemUser(MINIMAL_USER);

    expect(result.position).toBe(NO_VALUE_PLACEHOLDER);
    expect(result.contact).toBe(NO_VALUE_PLACEHOLDER);
    expect(result.divisionName).toBeUndefined();
  });

  it("maps role strings through mapApiRoleToDisplayRole", () => {
    /*
     * The API returns snake_case role strings; the UI uses Title Case.
     * Covers the three assignable roles plus the Super Admin fallback.
     */
    expect(mapUserResponseToSystemUser({ ...MINIMAL_USER, role: "admin" }).role).toBe("Admin");
    expect(mapUserResponseToSystemUser({ ...MINIMAL_USER, role: "receiver_officer" }).role).toBe(
      "Receiver",
    );
    expect(mapUserResponseToSystemUser({ ...MINIMAL_USER, role: "division" }).role).toBe("Division");
    expect(
      mapUserResponseToSystemUser({ ...MINIMAL_USER, role: "super_admin" }).role,
    ).toBe("Super Admin");
  });

  it("falls back to Admin for an unrecognised role", () => {
    /*
     * mapApiRoleToDisplayRole returns FALLBACK_ROLE ("Admin") for anything
     * not in the lookup table — this prevents a crash if the backend
     * introduces a new role before the frontend is updated.
     */
    const result = mapUserResponseToSystemUser({
      ...MINIMAL_USER,
      role: "some_new_role",
    });
    expect(result.role).toBe("Admin");
  });
});

describe("mapUsersResponseToSystemUsers", () => {
  it("maps an array of API users", () => {
    const result = mapUsersResponseToSystemUsers([FULL_USER, MINIMAL_USER]);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("u-100");
    expect(result[0].role).toBe("Admin");
    expect(result[1].id).toBe("u-200");
    expect(result[1].role).toBe("Receiver");
  });

  it("returns an empty array for an empty input", () => {
    expect(mapUsersResponseToSystemUsers([])).toEqual([]);
  });
});

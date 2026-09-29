/**
 * Unit tests for the `AdminAccessRow` access-control row component.
 *
 * This component renders one admin's permission matrix: master toggle
 * ("Access User Management") plus per-function toggles (Add, Edit, Reset
 * Password, Deactivate, Reactivate, Delete). Each toggle can be in one of
 * three states:
 *
 *   - enabled: user can click to change the draft.
 *   - locked:  gated behind a dependency (master off, or parent perm off).
 *   - saving:  this admin's PUT/REVOKE request is in flight → ALL toggles
 *              disabled so the draft can't mutate mid-flight.
 *
 * The Save button text and disabled state also depend on `isSaving` and
 * `hasChanges`. These tests verify all of that.
 *
 * ─── BACKEND → UI PERMISSION FLOW ────────────────────────────────────────────────
 *
 *   Backend (NestJS):
 *     RolesGuard      → `@Roles(Role.SuperAdmin, Role.Admin)` — only role_id
 *                        1 or 2 can reach the access-control page.
 *     PermissionsGuard → `@RequirePermission(Domain.UserManagement, Permission.View)`
 *                        gates the route. Super Admin (role_id 1) bypasses
 *                        all checks. Admin (role_id 2) must have
 *                        `user_management_permissions` with `view: true`.
 *
 *   Frontend:
 *     `AccessControlPage` → `UserManagementAccessTable` → `AdminAccessRow`
 *     Each admin's permission flags come from the API response
 *     (`UserManagementPermission.data`), mapped by `mapUserPermissionToAdminPermissions`.
 *
 * ─── WHAT THIS FILE TESTS ────────────────────────────────────────────────────────
 *
 *   1. Toggle disabled when isSaving (ALL toggles in the row).
 *   2. Toggle disabled when locked (master off / dependency unmet).
 *   3. Save button text flips to "Saving…" when isSaving.
 *   4. Save button disabled when isSaving or no changes.
 *   5. "Unsaved" / "Saving…" badges in the row header.
 *   6. Master toggle (grant/revoke) behavior.
 *   7. Grant all / Revoke all when master is on, disabled when saving.
 *   8. Save bar status text (pending / saving / saved / no changes).
 *   9. Expand / collapse behavior.
 *  10. Danger (high-risk) permission indicator.
 */

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { USER_MANAGEMENT_PERMISSIONS } from "../contants";
import type { AdminAccount, AdminPermissions } from "../types/access-controll-types";
import AdminAccessRow from "../components/AdminAccessRow";
import Toggle from "../components/Toggle";

// ─── Fixtures ────────────────────────────────────────────────────────────────────

const ADMIN: AdminAccount = {
  id: "admin-1",
  name: "Alice Reyes",
  email: "alice@peo.gov.ph",
  avatar: "AR",
};

/** All permissions granted — mirrors a fully-permissioned admin. */
const ALL_GRANTED: AdminPermissions = {
  "user_management.access": true,
  "user_management.add": true,
  "user_management.edit": true,
  "user_management.reset_password": true,
  "user_management.deactivate": true,
  "user_management.reactivate": true,
  "user_management.delete": true,
};

/** No permissions — master key is false; all functions off. */
const NONE_GRANTED: AdminPermissions = {
  "user_management.access": false,
  "user_management.add": false,
  "user_management.edit": false,
  "user_management.reset_password": false,
  "user_management.deactivate": false,
  "user_management.reactivate": false,
  "user_management.delete": false,
};

/** Master on, but all function perms off. */
const MASTER_ONLY: AdminPermissions = {
  "user_management.access": true,
  "user_management.add": false,
  "user_management.edit": false,
  "user_management.reset_password": false,
  "user_management.deactivate": false,
  "user_management.reactivate": false,
  "user_management.delete": false,
};

/** Helper to render with standard props. */
function renderRow(
  savedValues: AdminPermissions,
  overrides: {
    isSaving?: boolean;
    onSave?: (adminId: string, values: AdminPermissions) => void;
  } = {},
) {
  const onSave = overrides.onSave ?? vi.fn();
  const utils = render(
    <AdminAccessRow
      admin={ADMIN}
      permissions={USER_MANAGEMENT_PERMISSIONS}
      savedValues={savedValues}
      isSaving={overrides.isSaving ?? false}
      onSave={onSave}
    />,
  );
  return { ...utils, onSave };
}

// ─── Toggle: disabled when saving ─────────────────────────────────────────────────

describe("AdminAccessRow — Toggle disabled when saving", () => {
  /*
   * When `isSaving` is true, the parent passes it down to every Toggle in the
   * row via `disabled={locked || isSaving}`. This prevents draft mutations
   * while the PUT/REVOKE request is in flight, which could otherwise create
   * conflicting partial states.
   *
   * Backend: the `@RequirePermission` guard checks flags one at a time. If
   * two toggles fire while a save is in flight, the second request may
   * operate on stale committed state → race condition. Disabling toggles
   * during save is the UI-level guard against this.
   */

  it("disables ALL toggles when isSaving is true (with master granted)", () => {
    renderRow(ALL_GRANTED, { isSaving: true });

    // Expand to see toggles.
    fireEvent.click(screen.getByText(ADMIN.name));

    const toggles = screen.getAllByRole("switch");
    expect(toggles.length).toBeGreaterThan(0);

    // Every toggle must be disabled during save.
    toggles.forEach((t) => {
      expect(t).toBeDisabled();
    });
  });

  it("disables ALL toggles when isSaving is true (master not granted)", () => {
    /*
     * Even with master off (so function toggles are already locked), the
     * master toggle itself must also be disabled during save.
     */
    renderRow(NONE_GRANTED, { isSaving: true });

    // Expand to see toggles.
    fireEvent.click(screen.getByText(ADMIN.name));

    const toggles = screen.getAllByRole("switch");
    expect(toggles.length).toBeGreaterThan(0);

    toggles.forEach((t) => {
      expect(t).toBeDisabled();
    });
  });

  it("keeps toggles enabled when isSaving is false and master is granted", () => {
    renderRow(ALL_GRANTED, { isSaving: false });

    // Expand to see toggles.
    fireEvent.click(screen.getByText(ADMIN.name));

    const toggles = screen.getAllByRole("switch");
    toggles.forEach((t) => {
      expect(t).not.toBeDisabled();
    });
  });
});

// ─── Toggle: disabled when locked ─────────────────────────────────────────────────

describe("AdminAccessRow — Toggle disabled when locked", () => {
  /*
   * A toggle is `locked` when:
   *   - master access is off (!hasAccess), OR
   *   - a parent permission is off (!dependencyMet)
   *
   * Locked toggles show "Off" and are non-interactive even when not saving.
   */

  it("locks ALL function toggles when master access is off", () => {
    renderRow(NONE_GRANTED, { isSaving: false });

    // Expand to see toggles.
    fireEvent.click(screen.getByText(ADMIN.name));

    const toggles = screen.getAllByRole("switch");

    // The master toggle itself is NOT locked (you can always grant it).
    // Master is enabled, function toggles are locked.
    const masterToggle = toggles[0];
    expect(masterToggle).not.toBeDisabled();

    // All function toggles (after the master) should be disabled (locked).
    toggles.slice(1).forEach((t) => {
      expect(t).toBeDisabled();
    });
  });

  it("locks Reactivate and Delete when Deactivate is off", () => {
    /*
     * Reactivate and Delete both `dependOn: "user_management.deactivate"`.
     * If deactivate is off, they're locked even if master is on.
     */
    const savedValues: AdminPermissions = {
      "user_management.access": true,
      "user_management.add": true,
      "user_management.edit": true,
      "user_management.reset_password": true,
      "user_management.deactivate": false, // ← off
      "user_management.reactivate": true,
      "user_management.delete": true,
    };

    renderRow(savedValues, { isSaving: false });

    // Expand to see all toggles.
    fireEvent.click(screen.getByText(ADMIN.name));

    const toggles = screen.getAllByRole("switch");

    // Master and Add, Edit, ResetPassword are unlocked.
    // Reactivate and Delete are locked (depend on deactivate).
    // The toggles array order matches permission order:
    // [master, add, edit, reset_password, deactivate, reactivate, delete]
    expect(toggles[5]).toBeDisabled(); // reactivate
    expect(toggles[6]).toBeDisabled(); // delete
  });

  it("unlocks function toggles once master is granted (in the draft)", () => {
    /*
     * Start with master off → all function toggles locked.
     * Toggle master on in the draft → function toggles unlock.
     */
    renderRow(NONE_GRANTED, { isSaving: false });

    // Expand first.
    fireEvent.click(screen.getByText(ADMIN.name));

    const toggles = screen.getAllByRole("switch");

    // Initially locked.
    expect(toggles[1]).toBeDisabled(); // add

    // Toggle master on (first toggle).
    fireEvent.click(toggles[0]);

    // Now add should be unlocked.
    const updatedToggles = screen.getAllByRole("switch");
    expect(updatedToggles[1]).not.toBeDisabled();
  });
});

// ─── Save button: text + disabled state ───────────────────────────────────────────

describe("AdminAccessRow — Save button", () => {
  it("shows 'Saving…' text and is disabled when isSaving is true", () => {
    /*
     * The button text is `{isSaving ? "Saving…" : \`Save for ${name}\`}`.
     * When saving the button is disabled to prevent double-submits.
     */
    renderRow(ALL_GRANTED, { isSaving: true });

    // Save button is in the expanded section — expand first.
    fireEvent.click(screen.getByText(ADMIN.name));

    // Use ^saving to match only the Save button (not the header button which
    // also contains "Saving…" in its badge but starts with the admin name).
    const saveBtn = screen.getByRole("button", { name: /^saving/i });
    expect(saveBtn).toBeDisabled();
  });

  it("shows 'Save for {firstName}' text when not saving and has changes", () => {
    const onSave = vi.fn();
    renderRow(MASTER_ONLY, { onSave });

    // Expand and make a change.
    fireEvent.click(screen.getByText(ADMIN.name));
    const toggles = screen.getAllByRole("switch");
    fireEvent.click(toggles[1]); // toggle "add" on

    const saveBtn = screen.getByRole("button", { name: /save for/i });
    expect(saveBtn).not.toBeDisabled();
    expect(saveBtn).toHaveTextContent(/Save for Alice/i);
  });

  it("is disabled when there are no changes (even if not saving)", () => {
    renderRow(ALL_GRANTED, { isSaving: false });

    // Expand to see the Save button.
    fireEvent.click(screen.getByText(ADMIN.name));

    // No changes made → Save button disabled.
    const saveBtn = screen.getByRole("button", { name: /save for/i });
    expect(saveBtn).toBeDisabled();
  });
});

// ─── Row header: status badges ───────────────────────────────────────────────────

describe("AdminAccessRow — Header status badges", () => {
  it("shows 'Unsaved' badge when there are changes and not saving", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    // Expand and toggle a change.
    fireEvent.click(screen.getByText(ADMIN.name));
    const toggles = screen.getAllByRole("switch");
    fireEvent.click(toggles[1]); // turn on "add" → creates a change

    expect(screen.getByText("Unsaved")).toBeInTheDocument();
  });

  it("shows 'Saving…' badge in header when isSaving is true", () => {
    renderRow(ALL_GRANTED, { isSaving: true });

    expect(screen.getByText("Saving…")).toBeInTheDocument();
    // "Unsaved" badge should NOT appear during save.
    expect(screen.queryByText("Unsaved")).not.toBeInTheDocument();
  });

  it("shows granted-count badge when master is on and no pending changes", () => {
    renderRow(ALL_GRANTED, { isSaving: false });

    // 6 function keys are all true → "6 functions granted"
    expect(screen.getByText(/6 functions granted/i)).toBeInTheDocument();
  });

  it("shows 'No access' badge when master is off and no pending changes", () => {
    renderRow(NONE_GRANTED, { isSaving: false });

    expect(screen.getByText("No access")).toBeInTheDocument();
  });
});

// ─── Save bar: status text ───────────────────────────────────────────────────────

describe("AdminAccessRow — Save bar status text", () => {
  it("shows 'You have unsaved changes for this admin.' when hasChanges && !isSaving", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    fireEvent.click(screen.getByText(ADMIN.name));
    const toggles = screen.getAllByRole("switch");
    fireEvent.click(toggles[1]); // create a change

    expect(
      screen.getByText(/You have unsaved changes/i),
    ).toBeInTheDocument();
  });

  it("shows 'Saving your changes…' when isSaving is true", () => {
    renderRow(ALL_GRANTED, { isSaving: true });

    // Save bar is in the expanded section — expand first.
    fireEvent.click(screen.getByText(ADMIN.name));

    expect(screen.getByText(/Saving your changes…/i)).toBeInTheDocument();
  });

  it("shows 'No pending changes.' when no changes and not saving", () => {
    renderRow(ALL_GRANTED, { isSaving: false });

    // Expand to see the save bar.
    fireEvent.click(screen.getByText(ADMIN.name));

    expect(screen.getByText(/No pending changes/i)).toBeInTheDocument();
  });
});

// ─── Grant all / Revoke all ───────────────────────────────────────────────────────

describe("AdminAccessRow — Grant all / Revoke all", () => {
  /*
   * These buttons appear ONLY when master access is granted (hasAccess).
   * They are disabled during save (isSaving).
   */

  it("renders Grant all / Revoke all links when master is on", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    // Must expand first to see them.
    fireEvent.click(screen.getByText(ADMIN.name));

    expect(screen.getByText("Grant all functions")).toBeInTheDocument();
    expect(screen.getByText("Revoke all")).toBeInTheDocument();
  });

  it("hides Grant all / Revoke all when master is off", () => {
    renderRow(NONE_GRANTED, { isSaving: false });

    fireEvent.click(screen.getByText(ADMIN.name));

    expect(screen.queryByText("Grant all functions")).not.toBeInTheDocument();
    expect(screen.queryByText("Revoke all")).not.toBeInTheDocument();
  });

  it("disables Grant all / Revoke all when isSaving is true", () => {
    renderRow(ALL_GRANTED, { isSaving: true });

    fireEvent.click(screen.getByText(ADMIN.name));

    const grantAll = screen.getByText("Grant all functions");
    const revokeAll = screen.getByText("Revoke all");

    expect(grantAll).toBeDisabled();
    expect(revokeAll).toBeDisabled();
  });

  it("Grant all enables all function toggles", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    fireEvent.click(screen.getByText(ADMIN.name));
    fireEvent.click(screen.getByText("Grant all functions"));

    const toggles = screen.getAllByRole("switch");

    // After Grant all, all function toggles (index 1+) should be ON (checked).
    toggles.slice(1).forEach((t) => {
      expect(t).toHaveAttribute("aria-checked", "true");
    });
  });

  it("Revoke all disables all function toggles (in draft)", () => {
    renderRow(ALL_GRANTED, { isSaving: false });

    fireEvent.click(screen.getByText(ADMIN.name));
    fireEvent.click(screen.getByText("Revoke all"));

    const toggles = screen.getAllByRole("switch");

    // Master stays on; function toggles turn OFF.
    expect(toggles[0]).toHaveAttribute("aria-checked", "true");
    toggles.slice(1).forEach((t) => {
      expect(t).toHaveAttribute("aria-checked", "false");
    });
  });
});

// ─── Master toggle (Access User Management) ───────────────────────────────────────

describe("AdminAccessRow — Master toggle", () => {
  it("toggling master OFF clears all function permissions in the draft", () => {
    /*
     * handleToggle for the master key ("user_management.access") with val=false
     * iterates every function key and sets it to false — this mirrors the
     * backend's cascade: revoking master access revokes every sub-permission.
     */
    renderRow(ALL_GRANTED, { isSaving: false });

    fireEvent.click(screen.getByText(ADMIN.name));

    const toggles = screen.getAllByRole("switch");
    const masterToggle = toggles[0];

    // Master is on initially.
    expect(masterToggle).toHaveAttribute("aria-checked", "true");

    // Turn master off.
    fireEvent.click(masterToggle);

    const updatedToggles = screen.getAllByRole("switch");

    // Master is now off.
    expect(updatedToggles[0]).toHaveAttribute("aria-checked", "false");

    // All function toggles are also off.
    updatedToggles.slice(1).forEach((t) => {
      expect(t).toHaveAttribute("aria-checked", "false");
    });
  });

  it("toggling master ON sets all function permissions to true in the draft", () => {
    renderRow(NONE_GRANTED, { isSaving: false });

    fireEvent.click(screen.getByText(ADMIN.name));

    const masterToggle = screen.getAllByRole("switch")[0];

    // Master is off; turn it on.
    fireEvent.click(masterToggle);

    // Master should now be on.
    expect(screen.getAllByRole("switch")[0]).toHaveAttribute("aria-checked", "true");
  });
});

// ─── Expand / collapse ───────────────────────────────────────────────────────────

describe("AdminAccessRow — Expand / collapse", () => {
  it("starts collapsed (no permission toggles visible)", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    // Permission toggles only render when expanded.
    expect(screen.queryAllByRole("switch").length).toBe(0);
  });

  it("expands on header click, showing all permission toggles", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    fireEvent.click(screen.getByText(ADMIN.name));

    const toggles = screen.getAllByRole("switch");
    // 1 master + 6 functions = 7
    expect(toggles.length).toBe(7);
  });

  it("collapses on second header click, hiding permission toggles", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    const header = screen.getByText(ADMIN.name);

    fireEvent.click(header); // expand
    expect(screen.getAllByRole("switch").length).toBe(7);

    fireEvent.click(header); // collapse
    expect(screen.queryAllByRole("switch").length).toBe(0);
  });

  it("rotates chevron icon when expanded", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    const header = screen.getByText(ADMIN.name);
    const chevron = header.closest("button")?.querySelector("svg");

    // Collapsed: no rotate.
    expect(chevron).not.toHaveClass("rotate-180");

    fireEvent.click(header);

    // Expanded: rotate-180.
    expect(chevron).toHaveClass("rotate-180");
  });
});

// ─── Danger (high-risk) indicator ─────────────────────────────────────────────────

describe("AdminAccessRow — High-risk permission indicator", () => {
  /*
   * Permissions with `risk: "high"` (Deactivate, Delete) render a "High risk"
   * badge next to their label. This is a visual cue for admins granting
   * destructive capabilities.
   */

  it("renders 'High risk' badge for Deactivate permission", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    fireEvent.click(screen.getByText(ADMIN.name));

    // "High risk" appears for deactivate (and delete).
    expect(screen.getAllByText("High risk").length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT render 'High risk' for low-risk permissions", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    fireEvent.click(screen.getByText(ADMIN.name));

    // "Add users" label's container should not contain "High risk" text.
    const addUserEl = screen.getByText("Add users");
    const labelContainer = addUserEl.parentElement;
    expect(labelContainer?.textContent).not.toMatch(/high risk/i);
  });
});

// ─── Discard ──────────────────────────────────────────────────────────────────────

describe("AdminAccessRow — Discard", () => {
  it("Discard button reverts draft to savedValues", () => {
    renderRow(MASTER_ONLY, { isSaving: false });

    fireEvent.click(screen.getByText(ADMIN.name));
    const toggles = screen.getAllByRole("switch");

    // Make a change.
    fireEvent.click(toggles[1]); // add → on

    // Discard button appears when hasChanges && !isSaving.
    const discardBtn = screen.getByRole("button", { name: "Discard" });
    expect(discardBtn).toBeInTheDocument();

    fireEvent.click(discardBtn);

    // After discard, toggles revert to savedValues.
    const revertedToggles = screen.getAllByRole("switch");
    expect(revertedToggles[1]).toHaveAttribute("aria-checked", "false");
  });

  it("hides Discard when no changes", () => {
    renderRow(ALL_GRANTED, { isSaving: false });

    expect(screen.queryByRole("button", { name: "Discard" })).not.toBeInTheDocument();
  });
});

// ─── onSave callback ─────────────────────────────────────────────────────────────

describe("AdminAccessRow — onSave callback", () => {
  it("calls onSave with admin id and current draft", () => {
    const onSave = vi.fn();
    renderRow(MASTER_ONLY, { onSave });

    fireEvent.click(screen.getByText(ADMIN.name));
    const toggles = screen.getAllByRole("switch");

    // Toggle "add" on → creates a change.
    fireEvent.click(toggles[1]);

    const saveBtn = screen.getByRole("button", { name: /save for/i });
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      ADMIN.id,
      expect.objectContaining({
        "user_management.access": true,
        "user_management.add": true,
        "user_management.edit": false,
        "user_management.reset_password": false,
        "user_management.deactivate": false,
        "user_management.reactivate": false,
        "user_management.delete": false,
      }),
    );
  });

  it("calls onSave with admin id and revoked draft when master toggled off", () => {
    const onSave = vi.fn();
    renderRow(ALL_GRANTED, { onSave });

    fireEvent.click(screen.getByText(ADMIN.name));
    const toggles = screen.getAllByRole("switch");

    // Turn master off → cascade clears all.
    fireEvent.click(toggles[0]);

    const saveBtn = screen.getByRole("button", { name: /save for/i });
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      ADMIN.id,
      expect.objectContaining({
        "user_management.access": false,
        "user_management.add": false,
        "user_management.edit": false,
        "user_management.reset_password": false,
        "user_management.deactivate": false,
        "user_management.reactivate": false,
        "user_management.delete": false,
      }),
    );
  });
});

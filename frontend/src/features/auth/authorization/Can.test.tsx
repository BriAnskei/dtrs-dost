/**
 * Unit tests for the `Can` component — the declarative authz gate used
 * throughout the UI to show/hide actions based on the current user's
 * claims (permissions).
 *
 * WIRING: Can → usePermissions(moduleKey) → useUser() → UserContext
 * (populated by UserProvider from /user/me).  These tests mock useUser
 * and let the real usePermissions + Can logic run, so they verify the
 * end-to-end claims → render contract:
 *
 *   user.permissions[moduleKey][permission] === true  → render children
 *   otherwise                                          → render fallback (default: null)
 *
 * Super admin (role_id 1) bypasses the check and always renders children.
 * A null currentUser (session expired / not loaded yet) renders fallback.
 */

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { mockUseUser } = vi.hoisted(() => ({ mockUseUser: vi.fn() }));

vi.mock("../../../context/currentUser/use-user", () => ({
  useUser: mockUseUser,
}));

import type { User } from "../../../context/currentUser/curr-user.type";
import { render } from "../../../tests/test-utils";
import { Can } from "./Can";
import { UserManagementPermissionEnum } from "./enum/user-management-permission";

const FULL_PERMISSIONS = {
  view: true,
  add: true,
  edit: true,
  reset_password: true,
  deactivate: true,
  reactivate: true,
  delete: true,
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    full_name: "Jane Doe",
    email: "jane@example.com",
    role_id: 2,
    division_id: null,
    contact_number: null,
    position: null,
    is_active: true,
    permissions: { user_management_permissions: { ...FULL_PERMISSIONS } },
    ...overrides,
  };
}

describe("Can", () => {
  it("renders children when the user has the required permission", () => {
    mockUseUser.mockReturnValue({ currentUser: makeUser(), isLoading: false });

    render(
      <Can
        module="user_management_permissions"
        permission={UserManagementPermissionEnum.View}
      >
        <span data-testid="granted">User Management Page</span>
      </Can>,
    );

    expect(screen.getByTestId("granted")).toBeInTheDocument();
  });

  it("renders nothing (null fallback) when the user lacks the permission", () => {
    const user = makeUser({
      permissions: {
        user_management_permissions: {
          view: false,
          add: false,
          edit: false,
          reset_password: false,
          deactivate: false,
          reactivate: false,
          delete: false,
        },
      },
    });
    mockUseUser.mockReturnValue({ currentUser: user, isLoading: false });

    const { container } = render(
      <Can
        module="user_management_permissions"
        permission={UserManagementPermissionEnum.View}
      >
        <span data-testid="granted">User Management Page</span>
      </Can>,
    );

    expect(screen.queryByTestId("granted")).not.toBeInTheDocument();
    // Default fallback is null → empty container.
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a custom fallback when permission is denied", () => {
    const user = makeUser({
      permissions: {
        user_management_permissions: {
          view: false,
          add: false,
          edit: false,
          reset_password: false,
          deactivate: false,
          reactivate: false,
          delete: false,
        },
      },
    });
    mockUseUser.mockReturnValue({ currentUser: user, isLoading: false });

    render(
      <Can
        module="user_management_permissions"
        permission={UserManagementPermissionEnum.Delete}
        fallback={<span data-testid="denied">Access denied</span>}
      >
        <span data-testid="granted">Delete button</span>
      </Can>,
    );

    expect(screen.queryByTestId("granted")).not.toBeInTheDocument();
    expect(screen.getByTestId("denied")).toHaveTextContent("Access denied");
  });

  it("renders children for super admin (role_id 1) regardless of claims", () => {
    /*
     * Auth ↔ authz link: a super-admin session has role_id 1, so Can
     * short-circuits and renders children even if every permission
     * flag is false.
     */
    mockUseUser.mockReturnValue({
      currentUser: makeUser({
        role_id: 1,
        permissions: {
          user_management_permissions: {
            view: false,
            add: false,
            edit: false,
            reset_password: false,
            deactivate: false,
            reactivate: false,
            delete: false,
          },
        },
      }),
      isLoading: false,
    });

    render(
      <Can
        module="user_management_permissions"
        permission={UserManagementPermissionEnum.Delete}
      >
        <span data-testid="granted">Admin-only action</span>
      </Can>,
    );

    expect(screen.getByTestId("granted")).toBeInTheDocument();
  });

  it("renders fallback (null) when there is no current user", () => {
    /*
     * Session expired or not yet resolved — no user means no claims,
     * so no access.  Can renders its default null fallback.
     */
    mockUseUser.mockReturnValue({ currentUser: null, isLoading: false });

    const { container } = render(
      <Can
        module="user_management_permissions"
        permission={UserManagementPermissionEnum.View}
      >
        <span data-testid="granted">Content</span>
      </Can>,
    );

    expect(screen.queryByTestId("granted")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });
});

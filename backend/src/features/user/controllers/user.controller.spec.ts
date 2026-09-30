/**
 * Unit tests for `UserController`.
 *
 * WIRING:  UserController → UserService
 * (The controller is a thin delegation layer: it extracts HTTP params / body /
 *  query and forwards them to the service, returning whatever the service gives
 *  back.)
 *
 * STRATEGY:
 *   - The service is fully mocked (jest.fn per method) so tests verify the
 *     controller/service contract — argument forwarding, return-value passthrough
 *     against the real service return shapes, and void resolution on
 *     @HttpCode(204) endpoints — without touching the DB.
 *   - Decorator / guard enforcement: each endpoint that carries @Roles(...) and/or
 *     @RequirePermission(...) is verified for (a) correct decorator metadata and
 *     (b) actual enforcement by the real `RolesGuard` / `PermissionsGuard`,
 *     ensuring a `ForbiddenException` is thrown at the code level for users who
 *     lack the required role or permission claim.
 *
 * GUARDS:
 *   create                → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, Add)
 *   getCurrentUser        → open (no roles, no permissions)
 *   searchByName          → @Roles(SuperAdmin)
 *   findAll               → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, View)
 *   findAllDeactivated     → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, Deactivate)
 *   updateUserPassword     → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, ResetPassword)
 *   update                 → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, Edit)
 *   deactivate             → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, Deactivate)
 *   reactivate             → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, Reactivate)
 *   delete                 → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, Reactivate)
 */

import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import { PaginatedResponse } from "../../../common/pagination/paginated-response";
import { RolesGuard } from "../../../auth/authorization/guard/roles.guard";
import { PermissionsGuard } from "../../../auth/authorization/guard/permission.guard";
import { PermissionDomain } from "../../../auth/authorization/enum/permission-domain.enum";
import { UserManagementPermission } from "../../../auth/authorization/enum/user-management-permissions.enum";
import { Role } from "../../../auth/authorization/enum/roles.enum";
import { ROLES_KEY } from "../../../auth/authorization/decorator/roles.decorator";
import { PERMISSION_KEY } from "../../../auth/authorization/decorator/permissions.decorator";
import { UserSortOrder } from "../enums/user-sort-order-enum";
import { CreateUserDto } from "../dto/create/create-user-dto";
import { UpdateUserDto } from "../dto/updates/update-user-dto";
import { UpdateUserPasswordDto } from "../dto/updates/update-user-password.dto";
import { FindUsersQueryDto } from "../dto/queries/find-user-query-dto";
import { FindDeactivatedUsersQueryDto } from "../dto/queries/find-deactivated-user-query-dto";
import { UserService } from "../service/user.service";
import { UserController } from "./user.controller";

/* --- test fixtures ------------------------------------------------- */

/* SuperAdmin bypasses both RolesGuard and PermissionsGuard. */
const SUPER_ADMIN_USER = {
  id: "u-1",
  email: "superadmin@example.com",
  role_id: Role.SuperAdmin,
  permissions: { user_management_permissions: null },
};

/* ReceiverOfficer — not in any @Roles() set on the guarded endpoints. */
const RECEIVER_USER = {
  id: "u-3",
  email: "receiver@example.com",
  role_id: Role.ReceiverOfficer,
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
};

/* Admin user who passed RolesGuard but has every permission flag set to false. */
const ADMIN_USER_NO_PERMISSIONS = {
  id: "u-2",
  email: "admin@example.com",
  role_id: Role.Admin,
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
};

/* Admin user with all management permissions granted. */
const ADMIN_USER_FULL_PERMISSIONS = {
  id: "u-2",
  email: "admin@example.com",
  role_id: Role.Admin,
  permissions: {
    user_management_permissions: {
      view: true,
      add: true,
      edit: true,
      reset_password: true,
      deactivate: true,
      reactivate: true,
      delete: true,
    },
  },
};

/*
 * Builds a NestJS ExecutionContext whose getHandler() returns the actual
 * controller method (so the real Reflector reads @Roles / @RequirePermission
 * metadata that SetMetadata attached to the method function).
 */
function createContext(handler: Function, user: unknown): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => UserController,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

/* Helper: get the @Roles() metadata from a controller method. */
function getRoles(handler: Function): Role[] | undefined {
  return Reflect.getMetadata(ROLES_KEY, handler);
}

/* Helper: get the @RequirePermission() metadata from a controller method. */
function getPermission(handler: Function) {
  return Reflect.getMetadata(PERMISSION_KEY, handler);
}

describe("UserController", () => {
  let controller: UserController;
  let service: jest.Mocked<UserService>;
  let reflector: Reflector;

  beforeEach(async () => {
    const serviceMock = {
      create: jest.fn(),
      findCurrentUser: jest.fn(),
      searchByName: jest.fn(),
      findAll: jest.fn(),
      findAllDeactivated: jest.fn(),
      updateUserPassword: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      reactivate: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: serviceMock },
        RolesGuard,
        PermissionsGuard,
      ],
    }).compile();

    controller = module.get(UserController);
    service = module.get(UserService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /*
   * ==================================================================
   * DECORATOR & GUARD ENFORCEMENT
   * ==================================================================
   */
  describe("guard configuration", () => {
    /*
     * create — @Roles(SuperAdmin, Admin) + @RequirePermission(UM, Add)
     */
    it("create requires Admin-or-higher role AND Add permission", () => {
      const handler = UserController.prototype.create;

      expect(getRoles(handler)).toEqual([Role.SuperAdmin, Role.Admin]);
      expect(getPermission(handler)).toEqual({
        domain: PermissionDomain.UserManagement,
        permission: UserManagementPermission.Add,
      });

      const rolesGuard = new RolesGuard(reflector);
      const permissionsGuard = new PermissionsGuard(reflector);

      // ReceiverOfficer rejected by RolesGuard.
      expect(() =>
        rolesGuard.canActivate(createContext(handler, RECEIVER_USER)),
      ).toThrow(ForbiddenException);

      // Admin with no permissions rejected by PermissionsGuard.
      expect(() =>
        permissionsGuard.canActivate(createContext(handler, ADMIN_USER_NO_PERMISSIONS)),
      ).toThrow(ForbiddenException);

      // Admin with all permissions passes both guards.
      expect(rolesGuard.canActivate(createContext(handler, ADMIN_USER_FULL_PERMISSIONS))).toBe(
        true,
      );
      expect(
        permissionsGuard.canActivate(createContext(handler, ADMIN_USER_FULL_PERMISSIONS)),
      ).toBe(true);

      // SuperAdmin bypasses PermissionsGuard.
      expect(
        permissionsGuard.canActivate(createContext(handler, SUPER_ADMIN_USER)),
      ).toBe(true);
    });

    /*
     * searchByName — @Roles(SuperAdmin) only
     */
    it("searchByName requires SuperAdmin role", () => {
      const handler = UserController.prototype.searchByName;

      expect(getRoles(handler)).toEqual([Role.SuperAdmin]);
      expect(getPermission(handler)).toBeUndefined();

      const rolesGuard = new RolesGuard(reflector);

      // Admin (role 2) is NOT in [SuperAdmin(1)] → forbidden.
      expect(() =>
        rolesGuard.canActivate(createContext(handler, ADMIN_USER_FULL_PERMISSIONS)),
      ).toThrow(ForbiddenException);

      // SuperAdmin passes.
      expect(rolesGuard.canActivate(createContext(handler, SUPER_ADMIN_USER))).toBe(true);
    });

    /*
     * findAll — @Roles(SuperAdmin, Admin) + @RequirePermission(UM, View)
     */
    it("findAll requires Admin-or-higher role AND View permission", () => {
      const handler = UserController.prototype.findAll;

      expect(getRoles(handler)).toEqual([Role.SuperAdmin, Role.Admin]);
      expect(getPermission(handler)).toEqual({
        domain: PermissionDomain.UserManagement,
        permission: UserManagementPermission.View,
      });

      const rolesGuard = new RolesGuard(reflector);
      const permissionsGuard = new PermissionsGuard(reflector);

      expect(() =>
        rolesGuard.canActivate(createContext(handler, RECEIVER_USER)),
      ).toThrow(ForbiddenException);

      expect(() =>
        permissionsGuard.canActivate(
          createContext(handler, ADMIN_USER_NO_PERMISSIONS),
        ),
      ).toThrow(ForbiddenException);

      expect(
        permissionsGuard.canActivate(createContext(handler, ADMIN_USER_FULL_PERMISSIONS)),
      ).toBe(true);
    });

    /*
     * getCurrentUser — open (no roles, no permissions)
     */
    it("getCurrentUser has no role or permission restriction (open access)", () => {
      const handler = UserController.prototype.getCurrentUser;

      expect(getRoles(handler)).toBeUndefined();
      expect(getPermission(handler)).toBeUndefined();

      const rolesGuard = new RolesGuard(reflector);
      const permissionsGuard = new PermissionsGuard(reflector);

      // Any user passes both guards; guards short-circuit to true.
      expect(rolesGuard.canActivate(createContext(handler, RECEIVER_USER))).toBe(true);
      expect(
        permissionsGuard.canActivate(createContext(handler, RECEIVER_USER)),
      ).toBe(true);
    });

    /*
     * Parameterized check for the remaining Admin-gated endpoints:
     *   findAllDeactivated, updateUserPassword, update, deactivate,
     *   reactivate, delete
     * Each carries @Roles(SuperAdmin, Admin) and a specific
     * @RequirePermission claim.
     */
    it.each([
      ["findAllDeactivated", UserManagementPermission.Deactivate],
      ["updateUserPassword", UserManagementPermission.ResetPassword],
      ["update", UserManagementPermission.Edit],
      ["deactivate", UserManagementPermission.Deactivate],
      ["reactivate", UserManagementPermission.Reactivate],
      ["delete", UserManagementPermission.Reactivate],
    ])(
      "%s has correct Roles + RequirePermission metadata",
      (methodName, expectedPermission) => {
        const handler = (UserController.prototype as any)[methodName];

        expect(getRoles(handler)).toEqual([Role.SuperAdmin, Role.Admin]);
        expect(getPermission(handler)).toEqual({
          domain: PermissionDomain.UserManagement,
          permission: expectedPermission,
        });

        const rolesGuard = new RolesGuard(reflector);
        const permissionsGuard = new PermissionsGuard(reflector);

        // ReceiverOfficer → ForbiddenException from RolesGuard.
        expect(() =>
          rolesGuard.canActivate(createContext(handler, RECEIVER_USER)),
        ).toThrow(ForbiddenException);

        // Admin with all permissions → allowed.
        expect(
          permissionsGuard.canActivate(
            createContext(handler, ADMIN_USER_FULL_PERMISSIONS),
          ),
        ).toBe(true);

        // Admin with no permissions → ForbiddenException from PermissionsGuard.
        expect(() =>
          permissionsGuard.canActivate(
            createContext(handler, ADMIN_USER_NO_PERMISSIONS),
          ),
        ).toThrow(ForbiddenException);
      },
    );
  });

  /*
   * ==================================================================
   * SERVICE DELEGATION
   * ==================================================================
   */

  describe("create (POST /user/new)", () => {
    it("delegates the CreateUserDto to the service", async () => {
      const dto: CreateUserDto = {
        full_name: "Jane Doe",
        email: "jane@example.com",
        password: "securePassword123",
        role_id: "2",
      };

      service.create.mockResolvedValue(undefined);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBeUndefined();
    });

    it("propagates a ConflictException when the email already exists", async () => {
      const dto: CreateUserDto = {
        full_name: "Jane Doe",
        email: "jane@example.com",
        password: "securePassword123",
        role_id: "2",
      };

      const error = new Error("This email already exist");
      service.create.mockRejectedValue(error);

      await expect(controller.create(dto)).rejects.toThrow(error);
    });
  });

  describe("getCurrentUser (GET /user/me)", () => {
    /*
     * The endpoint reads `req.user.id` from the authenticated request and
     * forwards it to `findCurrentUser`.
     */
    it("extracts user id from the request and delegates to findCurrentUser", async () => {
      const mockReq = {
        user: {
          id: "user-1",
          email: "jane@example.com",
          role_id: Role.Admin,
          permissions: { user_management_permissions: null },
        },
      };

      /* The mock mirrors CurrentUserResponseDto shape exactly. */
      const expected = {
        id: "user-1",
        division_id: null,
        full_name: "Jane Doe",
        role_id: "2",
        email: "jane@example.com",
        contact_number: null,
        position: null,
        is_active: true,
        permissions: { user_management_permissions: null },
      };

      service.findCurrentUser.mockResolvedValue(expected);

      const result = await controller.getCurrentUser(mockReq as any);

      expect(service.findCurrentUser).toHaveBeenCalledTimes(1);
      expect(service.findCurrentUser).toHaveBeenCalledWith("user-1");
      expect(result).toBe(expected);
    });

    it("propagates an UnauthorizedException when the user no longer exists", async () => {
      const mockReq = {
        user: {
          id: "user-1",
          email: "jane@example.com",
          role_id: Role.Admin,
          permissions: { user_management_permissions: null },
        },
      };

      service.findCurrentUser.mockRejectedValue(new Error("User no longer exist"));

      await expect(controller.getCurrentUser(mockReq as any)).rejects.toThrow(
        "User no longer exist",
      );
    });
  });

  describe("searchByName (GET /user/search?search=...)", () => {
    it("delegates the search term to the service", async () => {
      const searchTerm = "Jane";

      /* Mirrors UserWithRelationResponseDto[] shape. */
      const expected = [
        {
          id: "user-1",
          full_name: "Jane Doe",
          position: null,
          contact: "09123456789",
          role: "Admin",
          division_name: undefined,
          email: "jane@example.com",
          created_at: new Date("2025-01-01T00:00:00Z"),
          deactivated_at: null,
        },
      ];

      service.searchByName.mockResolvedValue(expected);

      const result = await controller.searchByName(searchTerm);

      expect(service.searchByName).toHaveBeenCalledTimes(1);
      expect(service.searchByName).toHaveBeenCalledWith(searchTerm);
      expect(result).toBe(expected);
    });

    it("propagates service errors", async () => {
      service.searchByName.mockRejectedValue(new Error("search failed"));

      await expect(controller.searchByName("Jane")).rejects.toThrow("search failed");
    });
  });

  describe("findAll (GET /user?...) ", () => {
    it("forwards the query DTO and returns the paginated response", async () => {
      const query: FindUsersQueryDto = {
        limit: 20,
        sort: UserSortOrder.Newest,
      };

      const expected: PaginatedResponse<any> = {
        data: [{ id: "u1", full_name: "Jane Doe" }],
        nextCursor: "cursor-xyz",
      };

      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toBe(expected);
    });

    it("passes name, role_id, and cursor filters through to the service", async () => {
      const query: FindUsersQueryDto = {
        limit: 10,
        name: "John",
        role_id: Role.Admin,
        cursor: "cursor-abc",
        sort: UserSortOrder.Newest,
      };

      service.findAll.mockResolvedValue({ data: [], nextCursor: null });

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it("propagates service errors", async () => {
      service.findAll.mockRejectedValue(new Error("database down"));

      await expect(
        controller.findAll({ limit: 20, sort: UserSortOrder.Newest }),
      ).rejects.toThrow("database down");
    });
  });

  describe("findAllDeactivated (GET /user/deactivated?...) ", () => {
    it("forwards the query DTO and returns the paginated response", async () => {
      const query: FindDeactivatedUsersQueryDto = {
        limit: 20,
        sort: UserSortOrder.Newest,
      };

      const expected: PaginatedResponse<any> = {
        data: [{ id: "u2", full_name: "Inactive User" }],
        nextCursor: null,
      };

      service.findAllDeactivated.mockResolvedValue(expected);

      const result = await controller.findAllDeactivated(query);

      expect(service.findAllDeactivated).toHaveBeenCalledTimes(1);
      expect(service.findAllDeactivated).toHaveBeenCalledWith(query);
      expect(result).toBe(expected);
    });
  });

  describe("updateUserPassword (PATCH /user/password)", () => {
    it("delegates the UpdateUserPasswordDto to the service and resolves to undefined", async () => {
      const dto: UpdateUserPasswordDto = {
        user_id: "user-1",
        password: "newPassword456",
      };

      service.updateUserPassword.mockResolvedValue(undefined);

      const result = await controller.updateUserPassword(dto);

      expect(service.updateUserPassword).toHaveBeenCalledTimes(1);
      expect(service.updateUserPassword).toHaveBeenCalledWith(dto);
      expect(result).toBeUndefined();
    });

    it("propagates a NotFoundException when the user does not exist", async () => {
      const dto: UpdateUserPasswordDto = {
        user_id: "nonexistent",
        password: "newPassword456",
      };

      service.updateUserPassword.mockRejectedValue(new Error("User not found"));

      await expect(controller.updateUserPassword(dto)).rejects.toThrow("User not found");
    });
  });

  describe("update (PATCH /user/:id)", () => {
    it("delegates id and UpdateUserDto to the service and resolves to undefined", async () => {
      const id = "user-1";
      const dto: UpdateUserDto = {
        role_id: "2",
        full_name: "Jane Smith",
        email: "jane.smith@example.com",
      };

      service.update.mockResolvedValue(undefined);

      const result = await controller.update(id, dto);

      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toBeUndefined();
    });

    it("propagates a ConflictException when the new email is already in use", async () => {
      const id = "user-1";
      const dto: UpdateUserDto = {
        role_id: "2",
        email: "taken@example.com",
      };

      const error = new Error("Email is already in use.");
      service.update.mockRejectedValue(error);

      await expect(controller.update(id, dto)).rejects.toThrow(error);
    });
  });

  describe("deactivate (PATCH /user/:id/deactivate)", () => {
    /*
     * The controller reads the acting user's id from `req.user.id` and passes
     * it as the second argument so the service can prevent self-deactivation.
     */
    it("forwards both the target id and the acting user id from the request", async () => {
      const id = "user-to-deactivate";
      const mockReq = {
        user: {
          id: "acting-user-id",
          email: "admin@example.com",
          role_id: Role.SuperAdmin,
          permissions: { user_management_permissions: null },
        },
      };

      service.deactivate.mockResolvedValue(undefined);

      const result = await controller.deactivate(id, mockReq as any);

      expect(service.deactivate).toHaveBeenCalledTimes(1);
      expect(service.deactivate).toHaveBeenCalledWith(id, "acting-user-id");
      expect(result).toBeUndefined();
    });

    it("propagates a BadRequestException when deactivating your own account", async () => {
      const id = "user-1";
      const mockReq = {
        user: {
          id: "user-1",
          email: "jane@example.com",
          role_id: Role.SuperAdmin,
          permissions: { user_management_permissions: null },
        },
      };

      service.deactivate.mockRejectedValue(
        new Error("You cannot deactivate your own account"),
      );

      await expect(controller.deactivate(id, mockReq as any)).rejects.toThrow(
        "You cannot deactivate your own account",
      );
    });
  });

  describe("reactivate (PATCH /user/:id/reactivate)", () => {
    it("delegates the id to the service and resolves to undefined", async () => {
      const id = "user-3";

      service.reactivate.mockResolvedValue(undefined);

      const result = await controller.reactivate(id);

      expect(service.reactivate).toHaveBeenCalledTimes(1);
      expect(service.reactivate).toHaveBeenCalledWith(id);
      expect(result).toBeUndefined();
    });

    it("propagates a NotFoundException when the user does not exist", async () => {
      service.reactivate.mockRejectedValue(new Error("User not found"));

      await expect(controller.reactivate("nonexistent")).rejects.toThrow(
        "User not found",
      );
    });
  });

  describe("delete (DELETE /user/:id)", () => {
    it("delegates the id to the service and resolves to undefined", async () => {
      const id = "user-4";

      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete(id);

      expect(service.delete).toHaveBeenCalledTimes(1);
      expect(service.delete).toHaveBeenCalledWith(id);
      expect(result).toBeUndefined();
    });

    it("propagates a NotFoundException when the user does not exist", async () => {
      service.delete.mockRejectedValue(new Error("User not found"));

      await expect(controller.delete("nonexistent")).rejects.toThrow("User not found");
    });
  });
});

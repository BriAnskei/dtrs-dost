/**
 * Unit tests for `UserPermissionController`.
 *
 * WIRING:  UserPermissionController → UserPermissionService
 * (The controller is a thin delegation layer: it receives HTTP input, forwards
 *  it to the service, and returns whatever the service gives back.)
 *
 * STRATEGY:
 *   - The service is fully mocked (jest.fn per method) so tests verify the
 *     controller/service contract — argument forwarding, return-value passthrough
 *     against the real service return shapes, and void resolution on
 *     HttpCode(204) endpoints — without hitting the DB.
 *   - Error propagation is covered: when the service throws, the controller
 *     must let the error bubble up so Nest's exception filter maps it to the
 *     correct HTTP status.
 *   - Decorator / guard enforcement: each endpoint that carries `@Roles(...)`
 *     is verified for (a) correct decorator metadata and (b) actual enforcement
 *     by the real `RolesGuard` against an unauthorized user, ensuring a
 *     `ForbiddenException` is thrown at the code level.
 *
 * GUARDS:
 *   `findAllUserManagementPermission`  → @Roles(SuperAdmin)
 *   `setUserManagementPermission`      → @Roles(SuperAdmin)
 *   `revokeUserManagementPermission`   → no role restriction
 */

import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { ROLES_KEY } from "../../../auth/authorization/decorator/roles.decorator";
import { Role } from "../../../auth/authorization/enum/roles.enum";
import { RolesGuard } from "../../../auth/authorization/guard/roles.guard";
import { PaginatedResponse } from "../../../common/pagination/paginated-response";
import { FindDeactivatedUsersQueryDto } from "../../user/dto/queries/find-deactivated-user-query-dto";
import { UserSortOrder } from "../../user/enums/user-sort-order-enum";
import { SetUserManagementPermissionDto } from "../dto/client/set-user-management-permission-dto";
import {
  ManagementPermissionsResponseDto,
  UserPermissionResponseTo,
} from "../dto/response/user-management-permission-response";
import { UserPermissionService } from "../service/user-permission.service";
import { UserPermissionController } from "./user-permission.controller";

/* A user whose role already passed the RolesGuard but lacks claims. */
const ADMIN_USER_NO_PERMISSIONS = {
  id: "u-2",
  email: "admin@example.com",
  role_id: Role.Admin,
  permissions: {
    user_management_permissions: null,
  },
};

/* A receiver officer — not in any @Roles() set on the guarded endpoints. */
const RECEIVER_USER = {
  id: "u-3",
  email: "receiver@example.com",
  role_id: Role.ReceiverOfficer,
  permissions: {
    user_management_permissions: {
      add: false,
      edit: false,
      reset_password: false,
      deactivate: false,
      reactivate: false,
      delete: false,
    },
  },
};

/*
 * Builds a NestJS ExecutionContext whose getHandler() returns the actual
 * controller method (so the real Reflector can read @Roles /
 * @RequirePermission metadata that NestJS's SetMetadata attached to it).
 */
function createContext(handler: Function, user: unknown): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => UserPermissionController,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe("UserPermissionController", () => {
  let controller: UserPermissionController;
  let service: jest.Mocked<UserPermissionService>;
  let reflector: Reflector;

  beforeEach(async () => {
    const serviceMock = {
      findAllUserManagementPermissions: jest.fn(),
      setUserManagementPermission: jest.fn(),
      revokeUserManamenetPermission: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPermissionController],
      providers: [
        { provide: UserPermissionService, useValue: serviceMock },
        RolesGuard, // real guard, reads metadata via the injected Reflector
      ],
    }).compile();

    controller = module.get(UserPermissionController);
    service = module.get(UserPermissionService);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /*
   * ==================================================================
   * DECORATOR & GUARD ENFORCEMENT
   * ==================================================================
   *
   * For each endpoint we verify two things:
   *   1. METADATA — the @Roles() decorator is applied (read via
   *      Reflector.get) with the expected role set.
   *   2. ENFORCEMENT — RolesGuard.canActivate() actually throws
   *      ForbiddenException when an unauthorized user (ReceiverOfficer)
   *      tries to access the endpoint, proving the decorator + guard
   *      combination works end-to-end at the code level.
   */
  describe("guard configuration", () => {
    it("findAllUserManagementPermission requires SuperAdmin role", () => {
      const handler = UserPermissionController.prototype.findAllUserManagementPermission;

      const roles = reflector.get<Role[]>(ROLES_KEY, handler);
      expect(roles).toEqual([Role.SuperAdmin]);

      const guard = new RolesGuard(reflector);

      // SuperAdmin passes.
      const superAdmin = {
        id: "u-1",
        role_id: Role.SuperAdmin,
        permissions: { user_management_permissions: null },
      };
      expect(guard.canActivate(createContext(handler, superAdmin))).toBe(true);

      // ReceiverOfficer is forbidden.
      expect(() => guard.canActivate(createContext(handler, RECEIVER_USER))).toThrow(
        ForbiddenException,
      );
    });

    it("setUserManagementPermission requires SuperAdmin role", () => {
      const handler = UserPermissionController.prototype.setUserManagementPermission;

      const roles = reflector.get<Role[]>(ROLES_KEY, handler);
      expect(roles).toEqual([Role.SuperAdmin]);

      const guard = new RolesGuard(reflector);

      expect(() => guard.canActivate(createContext(handler, RECEIVER_USER))).toThrow(
        ForbiddenException,
      );
    });

    it("revokeUserManagementPermission has NO role restriction (open access)", () => {
      const handler = UserPermissionController.prototype.revokeUserManagementPermission;

      const roles = reflector.get<Role[]>(ROLES_KEY, handler);
      expect(roles).toBeUndefined();

      const guard = new RolesGuard(reflector);

      // No @Roles decorator → any authenticated user passes the guard.
      expect(guard.canActivate(createContext(handler, RECEIVER_USER))).toBe(true);
    });

    it("PUT and DELETE endpoints are configured with HttpCode 204", () => {
      const putHandler = UserPermissionController.prototype.setUserManagementPermission;
      const deleteHandler =
        UserPermissionController.prototype.revokeUserManagementPermission;

      expect(Reflect.getMetadata("__httpCode__", putHandler)).toBe(204);
      expect(Reflect.getMetadata("__httpCode__", deleteHandler)).toBe(204);
    });
  });

  /*
   * ==================================================================
   * SERVICE DELEGATION
   * ==================================================================
   */

  describe("findAllUserManagementPermission (GET /user-permissions/user-management)", () => {
    it("delegates to service and returns the full paginated response as-is", async () => {
      const query: FindDeactivatedUsersQueryDto = {
        limit: 20,
        sort: UserSortOrder.Newest,
      };

      /*
       * The mock response mirrors the exact shape the service returns:
       * PaginatedResponse<UserPermissionResponseTo<ManagementPermissionsResponseDto>>
       * — each entry carries the user fields plus a `data` block of management
       * permissions flags.
       */
      const managementPermissions: ManagementPermissionsResponseDto = {
        add: true,
        edit: false,
        reset_password: true,
        deactivate: false,
        reactivate: false,
        delete: false,
      };

      const expected: PaginatedResponse<
        UserPermissionResponseTo<ManagementPermissionsResponseDto>
      > = {
        data: [
          {
            user_id: "user-1",
            full_name: "Jane Doe",
            email: "jane@example.com",
            data: managementPermissions,
          },
        ],
        nextCursor: "cursor-next",
      };

      service.findAllUserManagementPermissions.mockResolvedValue(expected);

      const result = await controller.findAllUserManagementPermission(query);

      expect(service.findAllUserManagementPermissions).toHaveBeenCalledTimes(1);
      expect(service.findAllUserManagementPermissions).toHaveBeenCalledWith(query);
      expect(result).toBe(expected);
    });

    it("passes name and cursor filters through to the service", async () => {
      const query: FindDeactivatedUsersQueryDto = {
        limit: 10,
        name: "John",
        cursor: "cursor-abc",
        sort: UserSortOrder.Newest,
      };

      service.findAllUserManagementPermissions.mockResolvedValue({
        data: [],
        nextCursor: null,
      });

      await controller.findAllUserManagementPermission(query);

      expect(service.findAllUserManagementPermissions).toHaveBeenCalledWith(query);
    });

    it("propagates service errors without swallowing them", async () => {
      const query: FindDeactivatedUsersQueryDto = {
        limit: 20,
        sort: UserSortOrder.Newest,
      };

      service.findAllUserManagementPermissions.mockRejectedValue(
        new Error("database unavailable"),
      );

      await expect(controller.findAllUserManagementPermission(query)).rejects.toThrow(
        "database unavailable",
      );
    });
  });

  describe("setUserManagementPermission (PUT /user-permissions/user-management/:userId)", () => {
    it("delegates userId and dto to the service and resolves to undefined", async () => {
      const userId = "user-1";
      const dto: SetUserManagementPermissionDto = {
        add: true,
        edit: true,
        deactivate: true,
      };

      service.setUserManagementPermission.mockResolvedValue(undefined);

      const result = await controller.setUserManagementPermission(userId, dto);

      expect(service.setUserManagementPermission).toHaveBeenCalledTimes(1);
      expect(service.setUserManagementPermission).toHaveBeenCalledWith(userId, dto);
      expect(result).toBeUndefined();
    });

    it("propagates a BadRequestException from the service (e.g. granting reactivate without deactivate)", async () => {
      const userId = "user-2";
      const dto: SetUserManagementPermissionDto = {
        deactivate: false,
        reactivate: true,
      };

      const error = new Error(
        "reactivate and delete cannot be granted when deactivate is not granted",
      );
      service.setUserManagementPermission.mockRejectedValue(error);

      await expect(controller.setUserManagementPermission(userId, dto)).rejects.toThrow(
        error,
      );

      expect(service.setUserManagementPermission).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe("revokeUserManagementPermission (DELETE /:userId/user-management)", () => {
    it("delegates userId to the service and resolves to undefined", async () => {
      const userId = "user-3";

      service.revokeUserManamenetPermission.mockResolvedValue(undefined);

      const result = await controller.revokeUserManagementPermission(userId);

      expect(service.revokeUserManamenetPermission).toHaveBeenCalledTimes(1);
      /* The method name in the service has a typo (Manamenet) — confirm the
         controller calls it as-is. */
      expect(service.revokeUserManamenetPermission).toHaveBeenCalledWith(userId);
      expect(result).toBeUndefined();
    });

    it("propagates a NotFoundException when the user permission does not exist", async () => {
      const userId = "nonexistent";

      service.revokeUserManamenetPermission.mockRejectedValue(
        new Error("User permission does not exist"),
      );

      await expect(controller.revokeUserManagementPermission(userId)).rejects.toThrow(
        "User permission does not exist",
      );
    });
  });
});

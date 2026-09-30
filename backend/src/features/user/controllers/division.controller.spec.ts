/**
 * Unit tests for `DivisionController`.
 *
 * WIRING:  DivisionController → DivisionService
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
 *   findByName  → @Roles(SuperAdmin)
 *   findAll     → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, View)
 *   updateName  → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, View)
 *   delete      → @Roles(SuperAdmin, Admin) + @RequirePermission(UM, View)
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
import { DivisionSortOrder } from "../enums/division-sort-order-enum";
import { FindDivisionsQueryDto } from "../dto/queries/find-divisions-query-dto";
import { UpdateDivisionDto } from "../dto/updates/update-division-dto";
import { DivisionService } from "../service/division.service";
import { DivisionController } from "./division.controller";

/* --- test fixtures ------------------------------------------------- */

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

/*
 * Builds a NestJS ExecutionContext whose getHandler() returns the actual
 * controller method (so the real Reflector reads @Roles / @RequirePermission
 * metadata that SetMetadata attached to the method function).
 */
function createContext(handler: Function, user: unknown): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => DivisionController,
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

describe("DivisionController", () => {
  let controller: DivisionController;
  let service: jest.Mocked<DivisionService>;
  let reflector: Reflector;

  beforeEach(async () => {
    const serviceMock = {
      searchByName: jest.fn(),
      findAll: jest.fn(),
      updateName: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DivisionController],
      providers: [
        { provide: DivisionService, useValue: serviceMock },
        RolesGuard,
        PermissionsGuard,
      ],
    }).compile();

    controller = module.get(DivisionController);
    service = module.get(DivisionService);
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
    it("findByName requires SuperAdmin role", () => {
      const handler = DivisionController.prototype.findByName;

      expect(getRoles(handler)).toEqual([Role.SuperAdmin]);
      expect(getPermission(handler)).toBeUndefined();

      const rolesGuard = new RolesGuard(reflector);

      // Admin (role 2) is NOT SuperAdmin → forbidden.
      expect(() =>
        rolesGuard.canActivate(createContext(handler, ADMIN_USER_FULL_PERMISSIONS)),
      ).toThrow(ForbiddenException);

      // SuperAdmin passes.
      expect(rolesGuard.canActivate(createContext(handler, SUPER_ADMIN_USER))).toBe(true);
    });

    /*
     * findAll, updateName, and delete all share @Roles(SuperAdmin, Admin)
     * + @RequirePermission(UM, View).
     */
    it.each(["findAll", "updateName", "delete"])(
      "%s requires Admin-or-higher role AND View permission",
      (methodName) => {
        const handler = (DivisionController.prototype as any)[methodName];

        expect(getRoles(handler)).toEqual([Role.SuperAdmin, Role.Admin]);
        expect(getPermission(handler)).toEqual({
          domain: PermissionDomain.UserManagement,
          permission: UserManagementPermission.View,
        });

        const rolesGuard = new RolesGuard(reflector);
        const permissionsGuard = new PermissionsGuard(reflector);

        // ReceiverOfficer → ForbiddenException from RolesGuard.
        expect(() =>
          rolesGuard.canActivate(createContext(handler, RECEIVER_USER)),
        ).toThrow(ForbiddenException);

        // Admin with no permissions → ForbiddenException from PermissionsGuard.
        expect(() =>
          permissionsGuard.canActivate(
            createContext(handler, ADMIN_USER_NO_PERMISSIONS),
          ),
        ).toThrow(ForbiddenException);

        // Admin with all permissions → allowed.
        expect(
          permissionsGuard.canActivate(
            createContext(handler, ADMIN_USER_FULL_PERMISSIONS),
          ),
        ).toBe(true);

        // SuperAdmin bypasses PermissionsGuard.
        expect(
          permissionsGuard.canActivate(createContext(handler, SUPER_ADMIN_USER)),
        ).toBe(true);
      },
    );

    it("updateName and delete are configured with HttpCode 204", () => {
      const updateHandler = DivisionController.prototype.updateName;
      const deleteHandler = DivisionController.prototype.delete;

      expect(Reflect.getMetadata("__httpCode__", updateHandler)).toBe(204);
      expect(Reflect.getMetadata("__httpCode__", deleteHandler)).toBe(204);
    });
  });

  /*
   * ==================================================================
   * SERVICE DELEGATION
   * ==================================================================
   */

  describe("findByName (GET /division/search?search=...)", () => {
    it("delegates the search term to the service and returns the result", async () => {
      const searchTerm = "Engineering";

      /* DivisionEntity[] shape — the controller passes through unchanged. */
      const expected = [
        { id: "div-1", division_name: "Engineering", users: [] },
      ];

      service.searchByName.mockResolvedValue(expected as any);

      const result = await controller.findByName(searchTerm);

      expect(service.searchByName).toHaveBeenCalledTimes(1);
      expect(service.searchByName).toHaveBeenCalledWith(searchTerm);
      expect(result).toEqual(expected);
    });

    it("propagates service errors without swallowing them", async () => {
      service.searchByName.mockRejectedValue(new Error("search failed"));

      await expect(controller.findByName("Engineering")).rejects.toThrow("search failed");
    });
  });

  describe("findAll (GET /division?...)", () => {
    it("forwards the query DTO and returns the paginated response", async () => {
      const query: FindDivisionsQueryDto = {
        limit: 20,
        sort: DivisionSortOrder.NameAsc,
      };

      /* Mocks DivisionResponseDto[] shape — each division with its users. */
      const expected: PaginatedResponse<any> = {
        data: [
          {
            id: "div-1",
            division_name: "Engineering",
            users: [
              { id: "u1", full_name: "Jane Doe", email: "jane@example.com", is_active: true },
            ],
          },
        ],
        nextCursor: "cursor-next",
      };

      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toBe(expected);
    });

    it("passes search, sort, and cursor filters through to the service", async () => {
      const query: FindDivisionsQueryDto = {
        search: "Eng",
        sort: DivisionSortOrder.MostUsers,
        limit: 10,
        cursor: "cursor-abc",
      };

      service.findAll.mockResolvedValue({ data: [], nextCursor: null });

      await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it("propagates service errors", async () => {
      service.findAll.mockRejectedValue(new Error("database down"));

      await expect(
        controller.findAll({ limit: 20, sort: DivisionSortOrder.NameAsc }),
      ).rejects.toThrow("database down");
    });
  });

  describe("updateName (PATCH /division/:id)", () => {
    it("delegates id and UpdateDivisionDto to the service and resolves to undefined", async () => {
      const id = "div-1";
      const dto: UpdateDivisionDto = { division_name: "Updated Engineering" };

      service.updateName.mockResolvedValue(undefined);

      const result = await controller.updateName(id, dto);

      expect(service.updateName).toHaveBeenCalledTimes(1);
      expect(service.updateName).toHaveBeenCalledWith(id, dto);
      expect(result).toBeUndefined();
    });

    it("propagates a NotFoundException when the division does not exist", async () => {
      const id = "nonexistent";
      const dto: UpdateDivisionDto = { division_name: "Whatever" };

      service.updateName.mockRejectedValue(new Error("Division not found"));

      await expect(controller.updateName(id, dto)).rejects.toThrow(
        "Division not found",
      );

      expect(service.updateName).toHaveBeenCalledWith(id, dto);
    });
  });

  describe("delete (DELETE /division/:id)", () => {
    it("delegates the id to the service and resolves to undefined", async () => {
      const id = "div-2";

      service.delete.mockResolvedValue(undefined);

      const result = await controller.delete(id);

      expect(service.delete).toHaveBeenCalledTimes(1);
      expect(service.delete).toHaveBeenCalledWith(id);
      expect(result).toBeUndefined();
    });

    it("propagates a ConflictException when the division has assigned users", async () => {
      service.delete.mockRejectedValue(
        new Error("Division with assign users cannot not be deleted"),
      );

      await expect(controller.delete("div-with-users")).rejects.toThrow(
        "Division with assign users cannot not be deleted",
      );
    });

    it("propagates a NotFoundException when the division does not exist", async () => {
      service.delete.mockRejectedValue(new Error("Division not found"));

      await expect(controller.delete("nonexistent")).rejects.toThrow(
        "Division not found",
      );
    });
  });
});

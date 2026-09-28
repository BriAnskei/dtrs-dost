import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, QueryFailedError } from "typeorm";
import { PaginatedResponse } from "../../../common/pagination/paginated-response";
import { FindUserManagementPermissionsQueryDto } from "../dto/client/find-user-management-permission-dto";
import { SetUserManagementPermissionDto } from "../dto/client/set-user-management-permission-dto";
import {
  ManagementPermissionsResponseDto,
  UserPermissionResponseTo,
} from "../dto/response/user-management-permission-response";
import { UserPermissionsEntity } from "../entities/user-permissions-entity";
import { UserManagementPermissionRepository } from "../repository/user-management-permission.repository";
import { UserPermissionsRepository } from "../repository/user-permissions.repository";

@Injectable()
export class UserPermissionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly userPermissionRepository: UserPermissionsRepository,
    private readonly userManagementPermissionRepository: UserManagementPermissionRepository,
  ) {}

  private toDto<T>(
    userPermission: UserPermissionsEntity,
    data: T | null,
  ): UserPermissionResponseTo<T> {
    return {
      user_id: userPermission.user_id,
      full_name: userPermission.user.full_name,
      email: userPermission.user.email,
      data,
    };
  }

  private async createUserPermissionAsync(
    user_id: string,
    manager: EntityManager,
  ): Promise<UserPermissionsEntity> {
    const existingPermission = await this.userPermissionRepository.findByUserId(
      user_id,
      manager,
    );

    if (existingPermission) {
      return existingPermission;
    }

    try {
      return await this.userPermissionRepository.save({ user_id }, manager);
    } catch (error) {
      // PostgreSQL foreign-key violation
      if (error instanceof QueryFailedError && error.driverError?.code === "23503") {
        throw new NotFoundException("User not found");
      }

      throw error;
    }
  }

  // user management permissions
  async setUserManagementPermission(
    userId: string,
    dto: SetUserManagementPermissionDto,
  ): Promise<void> {
    this.validateManagementPermissions(dto);
    await this.dataSource.transaction(async (manager) => {
      const userPermission = await this.createUserPermissionAsync(userId, manager);

      await this.userManagementPermissionRepository.save(
        {
          user_permission_id: userPermission.id,
          ...dto,
        },
        manager,
      );
    });
  }

  private validateManagementPermissions(dto: SetUserManagementPermissionDto): void {
    if (dto.deactivate === false) {
      if (dto.reactivate === true || dto.delete === true) {
        throw new BadRequestException(
          "reactivate and delete cannot be granted when deactivate is not granted",
        );
      }
    }
  }

  async findAllUserManagementPermissions(
    query: FindUserManagementPermissionsQueryDto,
  ): Promise<
    PaginatedResponse<UserPermissionResponseTo<ManagementPermissionsResponseDto>>
  > {
    const { data: res, nextCursor } =
      await this.userPermissionRepository.findAllWithManagementPermissions(query);

    const data = res.map((userPermission) => {
      const managementPermissions = userPermission.managementPermissions;

      const permissions: ManagementPermissionsResponseDto | null = managementPermissions
        ? {
            add: managementPermissions.add,
            edit: managementPermissions.edit,
            reset_password: managementPermissions.reset_password,
            deactivate: managementPermissions.deactivate,
            reactivate: managementPermissions.reactivate,
            delete: managementPermissions.delete,
          }
        : null;

      return this.toDto<ManagementPermissionsResponseDto>(userPermission, permissions);
    });

    return {
      data,
      nextCursor,
    };
  }

  async revokeUserManamenetPermission(userId: string): Promise<void> {
    const userPermission = await this.userPermissionRepository.findByUserId(userId);

    if (!userPermission) throw new NotFoundException("User permission does not exist");

    const userManagemenrPermission =
      await this.userManagementPermissionRepository.findOne(userPermission.id);

    if (!userManagemenrPermission)
      throw new NotFoundException("User permission for user management does not exist");

    // drop user management completely
    await this.userManagementPermissionRepository.delete(
      userManagemenrPermission.user_permission_id,
    );
  }
}

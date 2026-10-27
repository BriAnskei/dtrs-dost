import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { Role } from "../../../auth/authorization/enum/roles.enum";
import { decodeCursor, encodeCursor } from "../../../common/pagination/cursor";
import { PaginatedResponse } from "../../../common/pagination/paginated-response";
import { UserCursor } from "../../user/types/user-cursor";
import { FindUserManagementPermissionsQueryDto } from "../dto/client/find-user-management-permission-dto";
import { UserPermissionsEntity } from "../entities/user-permissions-entity";

@Injectable()
export class UserPermissionsRepository {
  constructor(
    @InjectRepository(UserPermissionsEntity)
    private readonly repository: Repository<UserPermissionsEntity>,
  ) {}

  async save(
    data: Partial<UserPermissionsEntity>,
    manager: EntityManager,
  ): Promise<UserPermissionsEntity> {
    return manager.getRepository(UserPermissionsEntity).save(data);
  }

  async findAllWithManagementPermissions(
    query: FindUserManagementPermissionsQueryDto,
  ): Promise<PaginatedResponse<UserPermissionsEntity>> {
    const { limit, name, cursor } = query;

    const queryBuilder = this.repository
      .createQueryBuilder("userPermission")
      .leftJoinAndSelect("userPermission.managementPermissions", "managementPermission")
      .innerJoinAndSelect("userPermission.user", "user")
      .where("user.role_id = :adminRole", {
        adminRole: Role.Admin,
      })
      .orderBy("user.created_at", "DESC")
      .addOrderBy("user.id", "DESC");

    // Name filter
    if (name) {
      queryBuilder.andWhere("user.full_name ILIKE :name", {
        name: `%${name}%`,
      });
    }

    // Cursor
    if (cursor) {
      const decodedCursor = decodeCursor<UserCursor>(cursor);

      queryBuilder.andWhere(
        `(
        user.created_at < :cursorCreatedAt
        OR (
          user.created_at = :cursorCreatedAt
          AND user.id < :cursorId
        )
      )`,
        {
          cursorCreatedAt: decodedCursor.createdAt,
          cursorId: decodedCursor.id,
        },
      );
    }

    const data = await queryBuilder.take(limit + 1).getMany();

    const hasNextPage = data.length > limit;

    if (hasNextPage) {
      data.pop();
    }

    const lastUserPermission = data.at(-1);

    const nextCursor =
      hasNextPage && lastUserPermission
        ? encodeCursor<UserCursor>({
            createdAt: lastUserPermission.user.created_at.toISOString(),
            id: lastUserPermission.user.id,
          })
        : null;

    return {
      data,
      nextCursor,
    };
  }

  async findByUserId(
    user_id: string,
    manager?: EntityManager,
  ): Promise<UserPermissionsEntity | null> {
    const repo = !manager
      ? this.repository
      : manager.getRepository(UserPermissionsEntity);

    return repo.findOne({
      where: { user_id },
    });
  }

  async delete(id: string, manager?: EntityManager): Promise<boolean> {
    const repo = !manager
      ? this.repository
      : manager.getRepository(UserPermissionsEntity);

    const res = await repo.delete(id);

    return (res.affected ?? 0) > 0;
  }
}

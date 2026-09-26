import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type EntityManager, ILike, type Repository } from "typeorm";
import { Role } from "../../../auth/authorization/roles.enum";
import { decodeCursor, encodeCursor } from "../../../common/pagination/cursor";
import { escapeLike } from "../../../util/escapeLike";
import { FindDeactivatedUsersQueryDto } from "../dto/find-deactivated-user-query-dto";
import { FindUsersQueryDto } from "../dto/find-user-query-dto";
import { UserEntity } from "../entities/user.entity";
import { UserSortOrder } from "../enums/user-sort-order-enum";
import { DeactivatedUserCursor, UserCursor } from "../types/user-cursor";

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async save(userData: Partial<UserEntity>, manager: EntityManager): Promise<UserEntity> {
    return manager.getRepository(UserEntity).save(userData);
  }

  async findByEmail(email: string, manager?: EntityManager): Promise<UserEntity | null> {
    const repo = manager ? manager.getRepository(UserEntity) : this.repository;
    return repo.findOne({
      where: { email },
    });
  }

  async findById(id: string, manager?: EntityManager): Promise<UserEntity | null> {
    const repo = manager ? manager.getRepository(UserEntity) : this.repository;

    return repo.findOne({
      where: { id },
    });
  }

  async findByIdWithRelation(id: string, manager?: EntityManager): Promise<UserEntity> {
    const repo = manager ? manager.getRepository(UserEntity) : this.repository;

    return repo.findOneOrFail({
      where: { id },
      relations: {
        role: true,
        division: true,
      },
    });
  }

  async findAllWithRelation(
    query: FindUsersQueryDto,
  ): Promise<{ users: UserEntity[]; nextCursor: string | null }> {
    const { limit, cursor, name, role_id, sort = UserSortOrder.Newest } = query;

    const queryBuilder = this.repository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.role", "role")
      .leftJoinAndSelect("user.division", "division")
      .where("user.role_id != :superAdminRole", {
        superAdminRole: Role.SuperAdmin,
      })
      .andWhere("user.is_active = :isActive", {
        isActive: true,
      });

    // Name filter
    if (name) {
      queryBuilder.andWhere("user.full_name ILIKE :name", {
        name: `%${name}%`,
      });
    }

    // Role filter
    if (role_id !== undefined) {
      queryBuilder.andWhere("user.role_id = :roleId", {
        roleId: role_id,
      });
    }

    // Cursor
    if (cursor) {
      const decodedCursor = decodeCursor<UserCursor>(cursor);

      if (sort === UserSortOrder.Newest) {
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
      } else {
        queryBuilder.andWhere(
          `(
          user.created_at > :cursorCreatedAt
          OR (
            user.created_at = :cursorCreatedAt
            AND user.id > :cursorId
          )
        )`,
          {
            cursorCreatedAt: decodedCursor.createdAt,
            cursorId: decodedCursor.id,
          },
        );
      }
    }

    // Sorting
    if (sort === UserSortOrder.Newest) {
      queryBuilder.orderBy("user.created_at", "DESC").addOrderBy("user.id", "DESC");
    } else {
      queryBuilder.orderBy("user.created_at", "ASC").addOrderBy("user.id", "ASC");
    }

    const users = await queryBuilder.take(limit + 1).getMany();

    const hasNextPage = users.length > limit;

    if (hasNextPage) {
      users.pop();
    }

    const lastUser = users.at(-1);

    const nextCursor =
      hasNextPage && lastUser
        ? encodeCursor<UserCursor>({
            createdAt: lastUser.created_at.toISOString(),
            id: lastUser.id,
          })
        : null;

    return {
      users,
      nextCursor,
    };
  }

  async searchByName(name: string): Promise<UserEntity[]> {
    return this.repository.find({
      where: {
        full_name: ILike(`%${escapeLike(name)}%`),
      },
      relations: {
        role: true,
        division: true,
      },
      take: 20,
    });
  }

  async findAllByDivisionId(division_id: string): Promise<UserEntity[]> {
    return this.repository.find({
      where: { division_id },
    });
  }

  async findAllDeactivatedWithRelation(
    query: FindDeactivatedUsersQueryDto,
  ): Promise<{ users: UserEntity[]; nextCursor: string | null }> {
    const { limit, cursor, name, role_id, sort = UserSortOrder.Newest } = query;

    const queryBuilder = this.repository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.role", "role")
      .leftJoinAndSelect("user.division", "division")
      .where("user.role_id != :superAdminRole", {
        superAdminRole: Role.SuperAdmin,
      })
      .andWhere("user.is_active = :isActive", {
        isActive: false,
      })
      .andWhere("user.deactivated_at IS NOT NULL");

    // Name filter
    if (name) {
      queryBuilder.andWhere("user.full_name ILIKE :name", {
        name: `%${name}%`,
      });
    }

    // Role filter
    if (role_id !== undefined) {
      queryBuilder.andWhere("user.role_id = :roleId", {
        roleId: role_id,
      });
    }

    // Cursor
    if (cursor) {
      const decodedCursor = decodeCursor<DeactivatedUserCursor>(cursor);

      if (sort === UserSortOrder.Newest) {
        queryBuilder.andWhere(
          `(
          user.deactivated_at < :cursorDeactivatedAt
          OR (
            user.deactivated_at = :cursorDeactivatedAt
            AND user.id < :cursorId
          )
        )`,
          {
            cursorDeactivatedAt: decodedCursor.deactivatedAt,
            cursorId: decodedCursor.id,
          },
        );
      } else {
        queryBuilder.andWhere(
          `(
          user.deactivated_at > :cursorDeactivatedAt
          OR (
            user.deactivated_at = :cursorDeactivatedAt
            AND user.id > :cursorId
          )
        )`,
          {
            cursorDeactivatedAt: decodedCursor.deactivatedAt,
            cursorId: decodedCursor.id,
          },
        );
      }
    }

    // Sorting
    if (sort === UserSortOrder.Newest) {
      queryBuilder.orderBy("user.deactivated_at", "DESC").addOrderBy("user.id", "DESC");
    } else {
      queryBuilder.orderBy("user.deactivated_at", "ASC").addOrderBy("user.id", "ASC");
    }

    // Fetch one extra record to determine whether another page exists
    const users = await queryBuilder.take(limit + 1).getMany();

    const hasNextPage = users.length > limit;

    if (hasNextPage) {
      users.pop();
    }

    const lastUser = users.at(-1);

    const nextCursor =
      hasNextPage && lastUser?.deactivated_at
        ? encodeCursor<DeactivatedUserCursor>({
            deactivatedAt: lastUser.deactivated_at.toISOString(),
            id: lastUser.id,
          })
        : null;

    return {
      users,
      nextCursor,
    };
  }
  async deactivate(id: string): Promise<boolean> {
    const result = await this.repository.update(
      {
        id,
        is_active: true,
      },
      {
        is_active: false,
        deactivated_at: new Date(),
      },
    );

    return (result.affected ?? 0) > 0;
  }

  async reactivate(id: string): Promise<boolean> {
    const res = await this.repository.update(id, {
      is_active: true,
      deactivated_at: null,
    });

    return (res.affected ?? 0) > 0;
  }

  async updatePassword(
    id: string,
    password: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repo = manager ? manager.getRepository(UserEntity) : this.repository;

    const result = await repo.update(id, {
      password,
    });

    return (result.affected ?? 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);

    return (result.affected ?? 0) > 0;
  }
}

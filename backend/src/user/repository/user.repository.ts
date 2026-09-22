import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type EntityManager, ILike, MoreThan, Not, type Repository } from "typeorm";
import { Role } from "../../auth/authorization/roles.enum";
import { decodeCursor, encodeCursor } from "../../common/pagination/cursor";
import { escapeLike } from "../../util/escapeLike";
import { FindUsersQueryDto } from "../dto/find-user-query-dto";
import { UserEntity } from "../entities/user.entity";
import { SortOrder } from "../enums/sort-order.enum";

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async save(
    userData: Partial<UserEntity>,
    manager: EntityManager,
  ): Promise<UserEntity> {
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
    const { limit, cursor, name, role_id, sort = SortOrder.Newest } = query;

    const queryBuilder = this.repository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.role", "role")
      .leftJoinAndSelect("user.division", "division")
      .where("user.role_id != :superAdminRole", {
        superAdminRole: Role.SuperAdmin,
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
      const decodedCursor = decodeCursor(cursor);

      if (sort === SortOrder.Newest) {
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
    if (sort === SortOrder.Newest) {
      queryBuilder.orderBy("user.created_at", "DESC").addOrderBy("user.id", "DESC");
    } else {
      queryBuilder.orderBy("user.created_at", "ASC").addOrderBy("user.id", "ASC");
    }

    // Fetch one extra record to determine whether another page exists
    const users = await queryBuilder.take(limit + 1).getMany();

    const hasNextPage = users.length > limit;

    if (hasNextPage) {
      users.pop();
    }

    const lastUser = users.at(-1);

    const nextCursor =
      hasNextPage && lastUser
        ? encodeCursor({
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

  async findAllDeactivated(): Promise<UserEntity[]> {
    return this.repository.find({
      where: { is_active: false },
      relations: {
        division: true,
        role: true,
      },
    });
  }

  async deactivate(id: string): Promise<boolean> {
    const result = await this.repository.update(id, {
      is_active: false,
    });

    return (result.affected ?? 0) > 0;
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

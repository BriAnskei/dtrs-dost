import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, ILike, Repository } from "typeorm";
import { decodeCursor, encodeCursor } from "../../common/pagination/cursor";
import { escapeLike } from "../../util/escapeLike";
import { FindDivisionsQueryDto } from "../dto/find-divisions-query-dto";
import { DivisionEntity } from "../entities/division.entity";
import { DivisionSortOrder } from "../enums/division-sort-order-enum";
import { DivisionCursor } from "../types/division-cursor";

@Injectable()
export class DivisionRepository {
  constructor(
    @InjectRepository(DivisionEntity)
    private readonly repository: Repository<DivisionEntity>,
  ) {}

  async save(
    division: Partial<DivisionEntity>,
    manager?: EntityManager,
  ): Promise<DivisionEntity> {
    const repo = manager ? manager.getRepository(DivisionEntity) : this.repository;

    return repo.save(division);
  }

  async findOne(id: string): Promise<DivisionEntity | null> {
    return this.repository.findOne({
      where: {
        id,
      },
    });
  }

  async findByName(division_name: string): Promise<DivisionEntity | null> {
    return this.repository.findOne({
      where: {
        division_name,
      },
    });
  }

  async searchByName(search: string): Promise<DivisionEntity[] | null> {
    return this.repository.find({
      where: search.trim()
        ? {
            division_name: ILike(`%${escapeLike(search)}%`),
          }
        : undefined,
      order: {
        division_name: "ASC",
      },
      take: 20,
    });
  }

  async findAllWithUsers(query: FindDivisionsQueryDto): Promise<{
    divisions: DivisionEntity[];
    nextCursor: string | null;
  }> {
    const { limit = 20, cursor, search, sort = DivisionSortOrder.NameAsc } = query;

    /*
     * ------------------------------------------------------------
     * Query 1: determine the paginated division IDs/order
     * ------------------------------------------------------------
     */

    const rankingQuery = this.repository
      .createQueryBuilder("division")
      .select("division.id", "id")
      .addSelect("division.division_name", "division_name");

    /*
     * MostUsers requires the user count.
     */
    if (sort === DivisionSortOrder.MostUsers) {
      rankingQuery
        .leftJoin("division.users", "user")
        .addSelect("COUNT(user.id)", "user_count")
        .groupBy("division.id")
        .addGroupBy("division.division_name");
    }

    /*
     * ------------------------------------------------------------
     * Search
     * ------------------------------------------------------------
     */

    if (search) {
      rankingQuery.andWhere("division.division_name ILIKE :search", {
        search: `%${search}%`,
      });
    }

    /*
     * ------------------------------------------------------------
     * Cursor
     * ------------------------------------------------------------
     */

    if (cursor) {
      const decodedCursor = decodeCursor<DivisionCursor>(cursor);

      if (decodedCursor.sort !== sort) {
        throw new BadRequestException(
          "Cursor sort order does not match the requested sort order",
        );
      }

      if (decodedCursor.sort === DivisionSortOrder.NameAsc) {
        rankingQuery.andWhere(
          `(
          division.division_name > :cursorDivisionName
          OR (
            division.division_name = :cursorDivisionName
            AND division.id > :cursorId
          )
        )`,
          {
            cursorDivisionName: decodedCursor.divisionName,
            cursorId: decodedCursor.id,
          },
        );
      } else {
        rankingQuery.andWhere(
          `(
          COUNT(user.id) < :cursorUserCount
          OR (
            COUNT(user.id) = :cursorUserCount
            AND division.id > :cursorId
          )
        )`,
          {
            cursorUserCount: decodedCursor.userCount,
            cursorId: decodedCursor.id,
          },
        );
      }
    }

    /*
     * ------------------------------------------------------------
     * Sorting
     * ------------------------------------------------------------
     */

    if (sort === DivisionSortOrder.NameAsc) {
      rankingQuery
        .orderBy("division.division_name", "ASC")
        .addOrderBy("division.id", "ASC");
    } else {
      rankingQuery.orderBy("COUNT(user.id)", "DESC").addOrderBy("division.id", "ASC");
    }

    /*
     * ------------------------------------------------------------
     * Fetch one extra record to determine whether another page
     * exists.
     * ------------------------------------------------------------
     */

    const rankedDivisions = await rankingQuery.take(limit + 1).getRawMany<{
      id: string;
      division_name: string;
      user_count?: string;
    }>();

    const hasNextPage = rankedDivisions.length > limit;

    if (hasNextPage) {
      rankedDivisions.pop();
    }

    /*
     * ------------------------------------------------------------
     * Create next cursor
     * ------------------------------------------------------------
     */

    const lastDivision = rankedDivisions.at(-1);

    let nextCursor: string | null = null;

    if (hasNextPage && lastDivision) {
      if (sort === DivisionSortOrder.NameAsc) {
        nextCursor = encodeCursor<DivisionCursor>({
          sort: DivisionSortOrder.NameAsc,
          divisionName: lastDivision.division_name,
          id: lastDivision.id,
        });
      } else {
        nextCursor = encodeCursor<DivisionCursor>({
          sort: DivisionSortOrder.MostUsers,
          userCount: Number(lastDivision.user_count),
          id: lastDivision.id,
        });
      }
    }

    /*
     * ------------------------------------------------------------
     * No divisions found
     * ------------------------------------------------------------
     */

    if (rankedDivisions.length === 0) {
      return {
        divisions: [],
        nextCursor: null,
      };
    }

    /*
     * ------------------------------------------------------------
     * Query 2: fetch actual divisions + users
     * ------------------------------------------------------------
     */

    const divisionIds = rankedDivisions.map((division) => division.id);

    const divisions = await this.repository
      .createQueryBuilder("division")
      .leftJoinAndSelect("division.users", "user")
      .select([
        "division.id",
        "division.division_name",
        "user.id",
        "user.full_name",
        "user.email",
        "user.is_active",
      ])
      .where("division.id IN (:...divisionIds)", {
        divisionIds,
      })
      .getMany();

    /*
     * ------------------------------------------------------------
     * Restore Query 1 ordering.
     *
     * PostgreSQL does not guarantee that WHERE ... IN (...)
     * returns rows in the same order as divisionIds.
     * ------------------------------------------------------------
     */

    const divisionOrder = new Map(
      rankedDivisions.map((division, index) => [division.id, index]),
    );

    divisions.sort((a, b) => {
      const aIndex = divisionOrder.get(a.id);
      const bIndex = divisionOrder.get(b.id);

      if (aIndex === undefined || bIndex === undefined) {
        return 0;
      }

      return aIndex - bIndex;
    });

    return {
      divisions,
      nextCursor,
    };
  }

  async findAllWithRelation(): Promise<DivisionEntity[]> {
    return this.repository.find({
      relations: {
        users: true,
      },
    });
  }

  async updateName(id: string, division_name: string): Promise<boolean> {
    const res = await this.repository.update(id, {
      division_name,
    });

    return (res.affected ?? 0) > 0;
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.repository.delete(id);

    return (res.affected ?? 0) > 0;
  }
}

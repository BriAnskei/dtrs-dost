import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../../common/pagination/paginated-response";
import { capitalizeWords } from "../../util/capitalizer";
import { DivisionResponseDto } from "../dto/divisionWithUsers-response-dto";
import { FindDivisionsQueryDto } from "../dto/find-divisions-query-dto";
import { UpdateDivisionDto } from "../dto/update-division-dto";
import { DivisionEntity } from "../entities/division.entity";
import { DivisionRepository } from "../repository/division.repository";
import { UserRepository } from "../repository/user.repository";

@Injectable()
export class DivisionService {
  constructor(
    private readonly repository: DivisionRepository,
    private readonly userRepository: UserRepository,
  ) {}

  private toDto(division: DivisionEntity): DivisionResponseDto {
    return {
      id: division.id,
      division_name: division.division_name,
      users: division.users.map((user) => ({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        is_active: user.is_active,
      })),
    };
  }

  async searchByName(search: string): Promise<DivisionEntity[] | null> {
    return await this.repository.searchByName(search);
  }

  async findAll(
    query: FindDivisionsQueryDto,
  ): Promise<PaginatedResponse<DivisionResponseDto>> {
    const { divisions, nextCursor } = await this.repository.findAllWithUsers(query);

    return {
      data: divisions.map((division) => this.toDto(division)),
      nextCursor,
    };
  }

  async updateName(id: string, dto: UpdateDivisionDto) {
    const res = await this.repository.updateName(id, capitalizeWords(dto.division_name));

    if (!res) throw new NotFoundException("Division not found");
  }

  async delete(id: string) {
    const assignedUser = await this.userRepository.findAllByDivisionId(id);

    if (assignedUser.length > 0)
      throw new ConflictException("Division with assign users cannot not be deleted");

    const res = await this.repository.delete(id);

    if (!res) throw new NotFoundException("Division not found");
  }
}

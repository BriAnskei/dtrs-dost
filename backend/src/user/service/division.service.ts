import { Injectable, NotFoundException } from "@nestjs/common";
import { DivisionWithUsersResponseDto } from "../dto/divisionWithUsers-response-dto";
import { UpdateDivisionDto } from "../dto/update-division-dto";
import { DivisionEntity } from "../entities/division.entity";
import { DivisionRepository } from "../repository/division.repository";

@Injectable()
export class DivisionService {
  constructor(private readonly repository: DivisionRepository) {}

  async searchByName(search: string): Promise<DivisionEntity[] | null> {
    return await this.repository.searchByName(search);
  }

  async findAllWithUsers(): Promise<DivisionWithUsersResponseDto[]> {
    const divisions = await this.repository.findAllWithUser();

    return divisions.map((d) => this.toDto(d));
  }

  private toDto(division: DivisionEntity): DivisionWithUsersResponseDto {
    const dto = new DivisionWithUsersResponseDto();

    dto.id = division.id;
    dto.division_name = division.division_name;

    dto.users = (division.users ?? []).map((user) => ({
      full_name: user.full_name,
      email: user.email,
      is_active: user.is_active,
    }));

    return dto;
  }

  async updateName(id: string, dto: UpdateDivisionDto) {
    const res = await this.repository.updateName(id, dto.division_name);

    if (!res) throw new NotFoundException("Division not found");
  }

  async delete(id: string) {
    const res = await this.repository.delete(id);

    if (!res) throw new NotFoundException("Division not found");
  }
}

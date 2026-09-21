import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import * as argon2 from "argon2";
import { DataSource, EntityManager } from "typeorm";
import { PaginatedResponse } from "../../common/pagination/paginated-response";
import { capitalizeWords } from "../../util/capitalizer";
import { CreateUserDto } from "../dto/create-user-dto";
import { FindUsersQueryDto } from "../dto/find-user-query-dto";
import { UpdateUserPasswordDto } from "../dto/update-user-password.dto";
import { UserWithRelationResponseDto } from "../dto/userWithRelation-response-dto";
import { DivisionEntity } from "../entities/division.entity";
import { UserEntity } from "../entities/user.entity";
import { DivisionRepository } from "../repository/division.repository";
import { RoleRepository } from "../repository/role.repository";
import { UserRepository } from "../repository/user.repository";
import { formatPhoneNumber } from "../util/formatPhoneNumber";

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly divisionRepository: DivisionRepository,
    private readonly roleRepository: RoleRepository,
    private readonly dataSource: DataSource,
  ) {}

  private toDto(user: UserEntity): UserWithRelationResponseDto {
    const dto = new UserWithRelationResponseDto();
    dto.id = user.id;
    dto.full_name = user.full_name;
    dto.position = user.position ?? "";
    dto.email = user.email;
    dto.contact = user.contact_number ?? "";
    dto.division_name = user.division?.division_name;
    dto.role = user.role.name;
    dto.created_at = user.created_at;
    return dto;
  }

  async create(userData: CreateUserDto): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const existingUserWithThisEmail = await this.userRepository.findByEmail(
        userData.email,
      );

      if (existingUserWithThisEmail) {
        throw new ConflictException("This email already exist");
      }

      const existingRole = await this.roleRepository.findOne(userData.role_id);

      if (!existingRole) {
        throw new NotFoundException("Role not found");
      }

      const division = await this.makeDivisionAsync(userData, manager);

      await this.createNewUser(userData, manager, division);
    });
  }

  async findByIdWithRelation(
    id: string,
    manager?: EntityManager,
  ): Promise<UserWithRelationResponseDto> {
    const user = await this.userRepository.findByIdWithRelation(id, manager);

    return this.toDto(user);
  }

  async createNewUser(
    userData: CreateUserDto,
    manager: EntityManager,
    division: DivisionEntity | null,
  ): Promise<UserEntity> {
    const hashedPass = await argon2.hash(userData.password);

    return await this.userRepository.create(
      {
        full_name: capitalizeWords(userData.full_name),
        email: userData.email,
        password: hashedPass,
        role_id: userData.role_id,
        division_id: division?.id ?? null,
        position: userData.position ? capitalizeWords(userData.position) : null,
        contact_number: userData.contact_number
          ? formatPhoneNumber(userData.contact_number)
          : null,
      },
      manager,
    );
  }

  async makeDivisionAsync(
    userData: CreateUserDto,
    manager: EntityManager,
  ): Promise<DivisionEntity | null> {
    const division = userData.division;

    if (!division) return null;

    const existingDivision = await this.divisionRepository.findByName(division);

    if (existingDivision) {
      return existingDivision;
    }

    return await this.divisionRepository.save(
      { division_name: capitalizeWords(division) },
      manager,
    );
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email);
  }

  async searchByName(name: string): Promise<UserWithRelationResponseDto[] | null> {
    const users = await this.userRepository.searchByName(name);

    return users.map((u) => this.toDto(u));
  }

  async findCurrentUser(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new UnauthorizedException("User no longer exist");
    }

    return {
      id: user.id,
      division_id: user.division_id,
      full_name: user.full_name,
      role_id: user.role_id,
      email: user.email,
      contect_number: user.contact_number,
      position: user.position,
      is_active: user.is_active,
    };
  }

  async findById(id: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException("User does not exit");
    }

    return {
      id: user.id,
      division_id: user.division_id,
      full_name: user.full_name,
      role_id: user.role_id,
      email: user.email,
      contect_number: user.contact_number,
      position: user.position,
      is_active: user.is_active,
    };
  }

  async findByIdForAuth(id: string): Promise<UserEntity | null> {
    return this.userRepository.findById(id);
  }

  async findAll(
    query: FindUsersQueryDto,
  ): Promise<PaginatedResponse<UserWithRelationResponseDto>> {
    const { users, nextCursor } = await this.userRepository.findAllWithRelation(query);

    return {
      data: users.map((user) => this.toDto(user)),
      nextCursor,
    };
  }

  async findAllDeactivated(): Promise<UserWithRelationResponseDto[]> {
    const res = await this.userRepository.findAllDeactivated();

    return res.map((u) => this.toDto(u));
  }

  async updateUserPassword(dto: UpdateUserPasswordDto): Promise<void> {
    const hashedPassword = await argon2.hash(dto.password);

    const updated = await this.userRepository.updatePassword(dto.user_id, hashedPassword);

    if (!updated) {
      throw new NotFoundException("User not found");
    }
  }

  async deactivate(id: string): Promise<void> {
    const res = this.userRepository.deactivate(id);

    if (!res) throw new NotFoundException("User not found");
  }

  async delete(id: string): Promise<void> {
    const res = this.userRepository.delete(id);

    if (!res) throw new NotFoundException("User not found");
  }
}

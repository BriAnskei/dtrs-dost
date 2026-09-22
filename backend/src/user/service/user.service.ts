import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import * as argon2 from "argon2";
import { DataSource, EntityManager } from "typeorm";
import { $ZodUndefinedInternals } from "zod/v4/core";
import { Role } from "../../auth/authorization/roles.enum";
import { PaginatedResponse } from "../../common/pagination/paginated-response";
import { capitalizeWords } from "../../util/capitalizer";
import { CreateUserDto } from "../dto/create-user-dto";
import { FindUsersQueryDto } from "../dto/find-user-query-dto";
import { UpdateUserDto } from "../dto/update-user-dto";
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

      const existingRole = await this.roleRepository.findById(userData.role_id);

      if (!existingRole) {
        throw new NotFoundException("Role not found");
      }

      const division = await this.makeDivisionAsync(userData.division, manager);

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

    return await this.userRepository.save(
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
    division_name: string | undefined,
    manager: EntityManager,
  ): Promise<DivisionEntity | null> {
    if (!division_name) return null;

    const existingDivision = await this.divisionRepository.findByName(division_name);

    if (existingDivision) {
      return existingDivision;
    }

    return await this.divisionRepository.save(
      { division_name: capitalizeWords(division_name) },
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

  async update(id: string, dto: UpdateUserDto): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const user = await this.userRepository.findById(id, manager);

      if (!user) {
        throw new NotFoundException("User not found.");
      }

      if (dto.email && dto.email !== user.email) {
        const existingUser = await this.userRepository.findByEmail(dto.email, manager);

        if (existingUser && existingUser.id !== id) {
          throw new ConflictException({
            message: "Email is already in use.",
            error: "EMAIL_ALREADY_EXISTS",
          });
        }
      }

      // Update role
      if (dto.role_id !== undefined) {
        const role = await this.roleRepository.findById(dto.role_id, manager);

        if (!role) {
          throw new BadRequestException({
            message: "Invalid role.",
            error: "INVALID_ROLE",
          });
        }

        user.role_id = role.id;
        user.role = role;
      }

      // Handle division based on the resulting role
      if (dto.division && Number(user.role_id) === Role.Division) {
        if (!dto.division) {
          throw new BadRequestException("Division is required for Division users.");
        }

        const division = await this.makeDivisionAsync(dto.division, manager);

        if (!division) {
          throw new BadRequestException("Division is required.");
        }

        user.division_id = division.id;
        user.division = division;
      } else {
        // User is not a Division user, so remove their division assignment.
        user.division_id = null;
        user.division = null;
      }

      if (dto.full_name !== undefined) {
        user.full_name = capitalizeWords(dto.full_name);
      }

      if (dto.position !== undefined) {
        user.position = dto.position ? capitalizeWords(dto.position) : null;
      }

      if (dto.email !== undefined) {
        user.email = dto.email;
      }

      if (dto.contact_number !== undefined) {
        user.contact_number = dto.contact_number
          ? formatPhoneNumber(dto.contact_number)
          : null;
      }

      await this.userRepository.save(user, manager);
    });
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

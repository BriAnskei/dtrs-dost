import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import * as argon2 from "argon2";
import { DataSource, EntityManager } from "typeorm";
import { CreateUserDto } from "../dto/create-user-dto";
import { DivisionEntity } from "../entities/division.entity";
import { UserEntity } from "../entities/user.entity";
import { DivisionRepository } from "../repository/division.repository";
import { RoleRepository } from "../repository/role.repository";
import { UserRepository } from "../repository/user.repository";

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly divisionRepository: DivisionRepository,
    private readonly roleRepository: RoleRepository,
    private readonly dataSource: DataSource,
  ) {}

  async create(userData: CreateUserDto): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      const existingUserWithThisEmail = await this.userRepository.findByEmail(
        userData.email,
      );

      if (existingUserWithThisEmail) {
        throw new ConflictException("This email already exist");
      }

      const existingRole = await this.roleRepository.findOne(userData.role_id);

      if (!existingRole) throw new NotFoundException("Role not found");

      const division = await this.makeDivisionAsync(userData, manager);

      const res = await this.createNewUser(userData, division, manager);

      return this.userRepository.findByIdWithRelation(res.id);
    });
  }

  async createNewUser(
    userData: CreateUserDto,
    division: DivisionEntity,
    manager: EntityManager,
  ): Promise<UserEntity> {
    const hashedPass = await argon2.hash(userData.password);
    return await this.userRepository.create(
      {
        full_name: userData.full_name,
        email: userData.email,
        password: hashedPass,
        role_id: userData.role_id,
        division_id: division?.id ?? null,
        position: userData.position ?? null,
        contact_number: userData.contact_number ?? null,
      },
      manager,
    );
  }

  async makeDivisionAsync(
    userData: CreateUserDto,
    manager: EntityManager,
  ): Promise<DivisionEntity> {
    const existingDivision = await this.divisionRepository.findByName(userData.division);

    if (existingDivision) {
      return existingDivision;
    }

    return await this.divisionRepository.save(
      { division_name: userData.division },
      manager,
    );
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findByEmail(email);
  }

  async findById(id: string) {
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

  async findByIdForAuth(id: string): Promise<UserEntity | null> {
    return this.userRepository.findById(id);
  }

  async findAll(): Promise<UserEntity[]> {
    return await this.userRepository.findAllWithRelation();
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

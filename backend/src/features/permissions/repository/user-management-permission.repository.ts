import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { UserManagementPermissionsEntity } from "../entities/user-management-permissions-entity";

@Injectable()
export class UserManagementPermissionRepository {
  constructor(
    @InjectRepository(UserManagementPermissionsEntity)
    private readonly repository: Repository<UserManagementPermissionsEntity>,
  ) {}

  async save(
    data: Partial<UserManagementPermissionsEntity>,
    manager: EntityManager,
  ): Promise<UserManagementPermissionsEntity> {
    return manager.getRepository(UserManagementPermissionsEntity).save(data);
  }

  async findOne(
    user_permission_id: string,
  ): Promise<UserManagementPermissionsEntity | null> {
    return this.repository.findOne({
      where: {
        user_permission_id,
      },
    });
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.repository.delete(id);

    return (res.affected ?? 0) > 0;
  }
}

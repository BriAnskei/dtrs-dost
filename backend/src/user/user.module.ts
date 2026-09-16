import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserController } from "./controllers/user.controller";
import { UserEntity } from "./entities/user.entity";
import { UserRepository } from "./repository/user.repository";
import { UserService } from "./user.service";
import { RoleRepository } from './repository/role.repository';
import { DivisionRepository } from './repository/division.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UserController],
  providers: [UserService, UserRepository, RoleRepository, DivisionRepository],
  exports: [UserRepository],
})
export class UserModule {}

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DivisionController } from "./controllers/division.controller";
import { UserController } from "./controllers/user.controller";
import { DivisionEntity } from "./entities/division.entity";
import { RoleEntity } from "./entities/role.entity";
import { UserEntity } from "./entities/user.entity";
import { DivisionRepository } from "./repository/division.repository";
import { RoleRepository } from "./repository/role.repository";
import { UserRepository } from "./repository/user.repository";
import { DivisionService } from "./service/division.service";
import { UserService } from "./service/user.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity, DivisionEntity])],
  controllers: [UserController, DivisionController],
  providers: [
    UserService,
    UserRepository,
    RoleRepository,
    DivisionRepository,
    DivisionService,
  ],
  exports: [UserRepository, UserService],
})
export class UserModule {}

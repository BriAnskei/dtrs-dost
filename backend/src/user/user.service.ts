import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserEntity } from "./entities/user.entity";
import { UserRepository } from "./user.repository";

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

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
}

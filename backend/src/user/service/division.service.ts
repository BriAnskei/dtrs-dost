import { Injectable } from "@nestjs/common";
import { DivisionEntity } from "../entities/division.entity";
import { DivisionRepository } from "../repository/division.repository";

@Injectable()
export class DivisionService {
  constructor(private readonly repository: DivisionRepository) {}

  async searchByName(search: string): Promise<DivisionEntity[] | null> {
    return await this.repository.searchByName(search);
  }
}

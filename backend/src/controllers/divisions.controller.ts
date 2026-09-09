import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division } from '../entities/division.entity';

export interface DivisionListItem {
  id: string;
  name: string;
}

@Controller('divisions')
export class DivisionsController {
  constructor(
    @InjectRepository(Division)
    private readonly divisionRepository: Repository<Division>,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getDivisions(): Promise<DivisionListItem[]> {
    const divisions = await this.divisionRepository.find({
      order: { division_name: 'ASC' },
    });
    return divisions.map((d) => ({ id: d.id, name: d.division_name }));
  }
}

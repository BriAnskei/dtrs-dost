import { Test, TestingModule } from '@nestjs/testing';
import { DivisionRepository } from './division.repository';

describe('DivisionRepository', () => {
  let provider: DivisionRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DivisionRepository],
    }).compile();

    provider = module.get<DivisionRepository>(DivisionRepository);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});

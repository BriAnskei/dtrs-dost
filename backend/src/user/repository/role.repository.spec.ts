import { Test, TestingModule } from '@nestjs/testing';
import { RoleRepository } from './role.repository';

describe('RoleRepository', () => {
  let provider: RoleRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleRepository],
    }).compile();

    provider = module.get<RoleRepository>(RoleRepository);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});

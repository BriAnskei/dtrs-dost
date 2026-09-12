import { Test, type TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { AuthenticationService } from "./authentication.service";
import { UserRepository } from "../../user/user.repository";
import { RefreshTokenRepository } from "../repository/refresh-token.repository";

jest.mock("@nestjs/jwt", () => {
  class MockJwtService {
    signAsync = jest.fn().mockResolvedValue("test-token");
  }
  return { JwtService: MockJwtService };
});

describe("AuthenticationService", () => {
  let service: AuthenticationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        { provide: UserRepository, useValue: { findByEmail: jest.fn(), findById: jest.fn() } },
        {
          provide: RefreshTokenRepository,
          useValue: {
            deleteExpiredByUserId: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            deleteByTokenHash: jest.fn(),
            save: jest.fn(),
          },
        },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthenticationService>(AuthenticationService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
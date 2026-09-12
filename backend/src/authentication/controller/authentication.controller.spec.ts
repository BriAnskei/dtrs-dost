import { Test, type TestingModule } from "@nestjs/testing";
import { AuthenticationController } from "./authentication.controller";
import { AuthenticationService } from "../service/authentication.service";
import { Reflector } from "@nestjs/core";

jest.mock("@nestjs/jwt", () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    signAsync: jest.fn(),
  })),
}));

describe("AuthenticationController", () => {
  let controller: AuthenticationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        { provide: AuthenticationService, useValue: { login: jest.fn(), refresh: jest.fn(), logout: jest.fn() } },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn().mockReturnValue(true) } },
      ],
    }).compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});

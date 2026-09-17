import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import { UserService } from "../../../user/service/user.service";
import { JwtStrategy } from "./jwt.strategy";

jest.mock("@nestjs/passport", () => ({
  PassportStrategy: () => class {},
}));

jest.mock("passport-jwt", () => ({
  ExtractJwt: {
    fromExtractors: jest.fn().mockReturnValue(jest.fn()),
  },
  Strategy: class {},
}));

const mockUser = {
  id: "user-uuid-123",
  email: "test@example.com",
  role_id: 2,
  is_active: true,
};

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let userService: { findByIdForAuth: jest.Mock };

  beforeEach(async () => {
    userService = {
      findByIdForAuth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue("test-jwt-secret"),
          },
        },
        { provide: UserService, useValue: userService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  /**
   * Verifies that when the JWT payload contains a valid `sub` and the
   * corresponding user exists and is active, the validate method returns
   * the user's id, email, and role_id for use in authenticated requests.
   */
  it("should return user data when payload has valid sub and user is active", async () => {
    userService.findByIdForAuth.mockResolvedValue(mockUser);

    const result = await strategy.validate({ sub: mockUser.id });

    expect(userService.findByIdForAuth).toHaveBeenCalledWith(mockUser.id);
    expect(result).toEqual({
      id: mockUser.id,
      email: mockUser.email,
      role_id: mockUser.role_id,
    });
  });

  /**
   * Verifies that the constraint `!payload.sub` is enforced: when the JWT
   * payload lacks a `sub` field (undefined), the strategy throws an
   * UnauthorizedException with "Invalid token payload" before any user
   * lookup occurs.
   */
  it("should throw UnauthorizedException when payload.sub is undefined", async () => {
    const payload = { sub: undefined } as unknown as { sub: string };

    await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate(payload)).rejects.toThrow("Invalid token payload");

    expect(userService.findByIdForAuth).not.toHaveBeenCalled();
  });

  /**
   * Verifies that the constraint `!payload.sub` is enforced: when the JWT
   * payload has an empty string for `sub`, the strategy throws an
   * UnauthorizedException with "Invalid token payload" before any user
   * lookup occurs.
   */
  it("should throw UnauthorizedException when payload.sub is empty string", async () => {
    await expect(strategy.validate({ sub: "" })).rejects.toThrow(UnauthorizedException);
    await expect(strategy.validate({ sub: "" })).rejects.toThrow("Invalid token payload");

    expect(userService.findByIdForAuth).not.toHaveBeenCalled();
  });

  /**
   * Verifies that when the payload has a valid `sub` but the user is not
   * found in the database, the strategy throws UnauthorizedException with
   * "User is inactive or not found". This is the `!user` branch of the
   * constraint `!user || (user && !user.is_active)`.
   */
  it("should throw UnauthorizedException when user is not found", async () => {
    userService.findByIdForAuth.mockResolvedValue(null);

    await expect(strategy.validate({ sub: "nonexistent-id" })).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(strategy.validate({ sub: "nonexistent-id" })).rejects.toThrow(
      "User is inactive or not found",
    );

    expect(userService.findByIdForAuth).toHaveBeenCalledWith("nonexistent-id");
  });

  /**
   * Verifies that when the payload has a valid `sub`, the user is found,
   * but `is_active` is false, the strategy throws UnauthorizedException
   * with "User is inactive or not found". This is the `!user.is_active`
   * branch of the constraint `!user || (user && !user.is_active)`.
   */
  it("should throw UnauthorizedException when user is inactive", async () => {
    userService.findByIdForAuth.mockResolvedValue({
      ...mockUser,
      is_active: false,
    });

    await expect(strategy.validate({ sub: mockUser.id })).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(strategy.validate({ sub: mockUser.id })).rejects.toThrow(
      "User is inactive or not found",
    );

    expect(userService.findByIdForAuth).toHaveBeenCalledWith(mockUser.id);
  });
});

import { Reflector } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Response } from "express";
import { LoginThrottlerGuard } from "../guard/login-throttler.guard";
import { AuthenticationService } from "../service/authentication.service";
import { AuthenticationController } from "./authentication.controller";

type MockResponse = Pick<Response, "cookie" | "clearCookie">;
jest.mock("@nestjs/jwt", () => ({
  JwtService: jest.fn().mockImplementation(() => ({
    signAsync: jest.fn(),
  })),
}));

describe("AuthenticationController", () => {
  let controller: AuthenticationController;
  let authService: {
    login: jest.Mock;
    refresh: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [{ provide: AuthenticationService, useValue: authService }],
    })
      .overrideGuard(LoginThrottlerGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<AuthenticationController>(AuthenticationController);
  });

  describe("login", () => {
    /**
     * Verifies the happy path for login:
     * 1. Delegates to AuthenticationService.login with the provided DTO
     * 2. Sets the `refresh_token` cookie with the correct max age from the service response
     * 3. Sets the `access_token` cookie with a hardcoded 15-minute max age
     * 4. Both cookies use httpOnly, sameSite=lax, and secure only in production
     * 5. Returns only `user_data` to the client (tokens stay in cookies)
     */
    it("should set cookies with correct options and return user_data on successful login", async () => {
      const dto = {
        email: "test@example.com",
        password: "password123",
        remember_me: false,
      };
      const serviceResult = {
        user_data: {
          id: "user-id",
          division_id: "div-1",
          full_name: "Test User",
          role_id: 2,
          email: "test@example.com",
          contect_number: "+1234567890",
          is_active: true,
        },
        access_token: "access-jwt-token",
        refresh_token: "refresh-jwt-token",
        refresh_token_max_age_ms: 86400000,
      };
      authService.login.mockResolvedValue(serviceResult);

      const mockRes = createMockResponse();

      const result = await controller.login(dto, mockRes);

      expect(authService.login).toHaveBeenCalledWith(dto);

      // refresh_token cookie should use the max age returned by the service
      expect(mockRes.cookie).toHaveBeenCalledWith("refresh_token", "refresh-jwt-token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/authentication",
        maxAge: 86400000,
      });

      // access_token cookie is always 15 minutes regardless of remember_me
      expect(mockRes.cookie).toHaveBeenCalledWith("access_token", "access-jwt-token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60 * 1000,
      });

      // Only user_data is returned; tokens are stored in cookies
      expect(result).toEqual({
        user_data: serviceResult.user_data,
      });
    });

    /**
     * Verifies that when remember_me is true, the refresh_token cookie
     * max age reflects the 30-day expiration rather than the default 1 day.
     */
    it("should set refresh_token cookie with 30-day max age when remember_me is true", async () => {
      const dto = {
        email: "test@example.com",
        password: "password123",
        remember_me: true,
      };
      const serviceResult = {
        user_data: {
          id: "user-id",
          division_id: "div-1",
          full_name: "Test User",
          role_id: 2,
          email: "test@example.com",
          contect_number: "+1234567890",
          is_active: true,
        },
        access_token: "access-jwt-token",
        refresh_token: "refresh-jwt-token",
        refresh_token_max_age_ms: 30 * 24 * 60 * 60 * 1000,
      };
      authService.login.mockResolvedValue(serviceResult);

      const mockRes = createMockResponse();

      const result = await controller.login(dto, mockRes);

      expect(mockRes.cookie).toHaveBeenCalledWith(
        "refresh_token",
        "refresh-jwt-token",
        expect.objectContaining({
          maxAge: 30 * 24 * 60 * 60 * 1000,
        }),
      );

      expect(result).toHaveProperty("user_data");
    });

    /**
     * Verifies that when the service throws (e.g. invalid credentials),
     * the error propagates and no cookies are set.
     */
    it("should propagate error from service and not set any cookies", async () => {
      authService.login.mockRejectedValue(new Error("Invalid credentials"));

      const mockRes = createMockResponse();

      await expect(
        controller.login(
          { email: "bad@example.com", password: "wrong", remember_me: false },
          mockRes,
        ),
      ).rejects.toThrow("Invalid credentials");

      expect(mockRes.cookie).not.toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    /**
     * Verifies the happy path for refresh:
     * 1. Extracts the refresh_token from `req.cookies.refresh_token`
     * 2. Delegates to AuthenticationService.refresh with that token
     * 3. Sets new access_token and refresh_token cookies with correct options
     * 4. Returns a success message (not the tokens — tokens stay in cookies)
     */
    it("should extract refresh token from cookies, refresh tokens, and set new cookies", async () => {
      const serviceResult = {
        access_token: "new-access-token",
        refresh_token: "new-refresh-token",
        refresh_token_max_age_ms: 86400000,
      };
      authService.refresh.mockResolvedValue(serviceResult);

      const mockReq = { cookies: { refresh_token: "old-refresh-token" } };
      const mockRes = createMockResponse();

      const result = await controller.refresh(mockReq as never, mockRes as never);

      expect(authService.refresh).toHaveBeenCalledWith("old-refresh-token");

      expect(mockRes.cookie).toHaveBeenCalledWith("access_token", "new-access-token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60 * 1000,
      });

      expect(mockRes.cookie).toHaveBeenCalledWith("refresh_token", "new-refresh-token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/authentication",
        maxAge: 86400000,
      });

      expect(result).toEqual({
        message: "Token refreshed successfully",
      });
    });

    /**
     * Verifies that when no cookies exist on the request (cookies is undefined),
     * `undefined` is passed to the service, which will throw an
     * UnauthorizedException("Refresh token not found").
     */
    it("should pass undefined to service when cookies are not present", async () => {
      authService.refresh.mockResolvedValue({
        access_token: "token",
        refresh_token: "token",
        refresh_token_max_age_ms: 86400000,
      });

      const mockReq = {};
      const mockRes = createMockResponse();

      await controller.refresh(mockReq as never, mockRes as never);

      expect(authService.refresh).toHaveBeenCalledWith(undefined);
    });

    /**
     * Verifies that when cookies exist but refresh_token is missing,
     * `undefined` is passed to the service.
     */
    it("should pass undefined to service when refresh_token cookie is missing", async () => {
      authService.refresh.mockResolvedValue({
        access_token: "token",
        refresh_token: "token",
        refresh_token_max_age_ms: 86400000,
      });

      const mockReq = { cookies: {} };
      const mockRes = createMockResponse();

      await controller.refresh(mockReq as never, mockRes as never);

      expect(authService.refresh).toHaveBeenCalledWith(undefined);
    });

    /**
     * Verifies that when the service throws (e.g. expired token),
     * the error propagates and no new cookies are set.
     */
    it("should propagate error from service during refresh", async () => {
      authService.refresh.mockRejectedValue(new Error("Invalid refresh token"));

      const mockReq = { cookies: { refresh_token: "bad-token" } };
      const mockRes = createMockResponse();

      await expect(
        controller.refresh(mockReq as never, mockRes as never),
      ).rejects.toThrow("Invalid refresh token");

      expect(mockRes.cookie).not.toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    /**
     * Verifies the happy path for logout:
     * 1. Extracts the refresh_token from cookies
     * 2. Delegates to AuthenticationService.logout
     * 3. Clears both refresh_token and access_token cookies
     * 4. Returns a success message
     */
    it("should clear both cookies and return success message on logout", async () => {
      authService.logout.mockResolvedValue({
        message: "Logged out successfully",
      });

      const mockReq = { cookies: { refresh_token: "some-token" } };
      const mockRes = createMockResponse();

      const result = await controller.logout(mockReq as never, mockRes as never);

      expect(authService.logout).toHaveBeenCalledWith("some-token");

      expect(mockRes.clearCookie).toHaveBeenCalledWith("refresh_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/authentication",
      });

      expect(mockRes.clearCookie).toHaveBeenCalledWith("access_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });

      expect(result).toEqual({
        message: "Logout successfully",
      });
    });

    /**
     * Verifies that logout works even when no refresh_token cookie exists.
     * The controller passes undefined to the service, which handles the
     * null case gracefully by returning a success message without deletion.
     */
    it("should call logout with undefined when no refresh_token cookie present", async () => {
      authService.logout.mockResolvedValue({
        message: "Logged out successfully",
      });

      const mockReq = { cookies: {} };
      const mockRes = createMockResponse();

      await controller.logout(mockReq as never, mockRes as never);

      expect(authService.logout).toHaveBeenCalledWith(undefined);

      expect(mockRes.clearCookie).toHaveBeenCalledWith("refresh_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/authentication",
      });

      expect(mockRes.clearCookie).toHaveBeenCalledWith("access_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    });

    /**
     * Verifies that when cookies is undefined entirely,
     * logout still proceeds and clears cookies successfully.
     */
    it("should clear cookies even when cookies object is undefined", async () => {
      authService.logout.mockResolvedValue({
        message: "Logged out successfully",
      });

      const mockReq = {};
      const mockRes = createMockResponse();

      await controller.logout(mockReq as never, mockRes as never);

      expect(authService.logout).toHaveBeenCalledWith(undefined);
      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * Creates a mock Express Response object with jest.fn() stubs for
 * `cookie` and `clearCookie`. Used throughout the controller tests
 * to verify cookie operations without a real HTTP server.
 */
function createMockResponse(): MockResponse {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };
}

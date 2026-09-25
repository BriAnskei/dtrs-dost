/**
 * Tests for `useDirectResetStep` — the sub-hook that handles a direct
 * (admin-chosen) password reset.
 *
 * WHY THIS HOOK MATTERS:
 *   After the admin verifies their own password and chooses "Set a password
 *   directly", this hook presents a new-password + confirm-password form,
 *   validates it client-side, calls `userService.updatePassword`, and shows
 *   a success checkmark on completion. `isResetting` drives the "Resetting…"
 *   button text and disabled state.
 *
 * WHAT WE MOCK:
 *   - `userService` (../../services/user.service) — `updatePassword` controls
 *     success/failure.
 *   - `passwordGenerator` (../../utils/passwordGenerator) — mocked so tests
 *     are deterministic (real impl uses crypto-random).
 *   - `getErrorMessage` (../../../../lib/api-error) — left REAL (pure function).
 *   - `sonner` (toast) — assert success/error surfacing.
 *
 * The hook takes a `SystemUser` argument so the success toast can include the
 * user's name.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SystemUser } from "../../types/user.type";
import { useDirectResetStep } from "./use-direct-reset-step";

const { mockUpdatePassword, mockPasswordGenerator, mockToast } = vi.hoisted(() => ({
  mockUpdatePassword: vi.fn(),
  mockPasswordGenerator: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../services/user.service", () => ({
  userService: { updatePassword: mockUpdatePassword },
}));

vi.mock("../../utils/passwordGenerator", () => ({
  passwordGenerator: mockPasswordGenerator,
}));

// `getErrorMessage` is a pure function — let the real implementation run.

vi.mock("sonner", () => ({
  toast: mockToast,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER: SystemUser = {
  id: "u-1",
  name: "Alice Reyes",
  position: "Engineer",
  divisionName: "NCR",
  role: "Admin",
  email: "alice@example.gov.ph",
  contact: "09171234567",
  createtAt: "Jan 2025",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function axiosError(status: number, message: string) {
  return new AxiosError(message, AxiosError.ERR_BAD_REQUEST, undefined, undefined, {
    data: { message },
    status,
    statusText: "Error",
    headers: {},
    config: {} as never,
    request: {},
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useDirectResetStep", () => {
  beforeEach(() => {
    // Suppress debug console.log("error") from the source's onError handler.
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    mockUpdatePassword.mockReset();
    mockPasswordGenerator.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("validation", () => {
    it("rejects an empty password", () => {
      /*
       * Empty password = "New password is required." and NO call to
       * updatePassword.
       */
      const client = makeClient();
      const { result } = renderHook(() => useDirectResetStep(USER), {
        wrapper: makeWrapper(client),
      });

      act(() => {
        result.current.handleDirectSubmit();
      });

      expect(mockUpdatePassword).not.toHaveBeenCalled();
      expect(result.current.directErrors.password).toBe("New password is required.");

      client.clear();
    });

    it("rejects a password shorter than 8 characters", () => {
      const client = makeClient();
      const { result } = renderHook(() => useDirectResetStep(USER), {
        wrapper: makeWrapper(client),
      });

      act(() => {
        result.current.setDirectForm({ password: "short", confirmPassword: "short" });
      });

      act(() => {
        result.current.handleDirectSubmit();
      });

      expect(mockUpdatePassword).not.toHaveBeenCalled();
      expect(result.current.directErrors.password).toBe("Use at least 8 characters.");

      client.clear();
    });

    it("rejects when the two passwords do not match", () => {
      const client = makeClient();
      const { result } = renderHook(() => useDirectResetStep(USER), {
        wrapper: makeWrapper(client),
      });

      act(() => {
        result.current.setDirectForm({
          password: "long-enough",
          confirmPassword: "mismatch",
        });
      });

      act(() => {
        result.current.handleDirectSubmit();
      });

      expect(mockUpdatePassword).not.toHaveBeenCalled();
      expect(result.current.directErrors.confirmPassword).toBe("Passwords don't match.");

      client.clear();
    });

    it("clears the password error when generate password is clicked", () => {
      /*
       * `handleGeneratePassword` is the only UI action that clears errors
       * (it calls `setDirectErrors({ password: undefined, ... })`).
       * `setDirectForm` alone does NOT clear errors — they are separate
       * state variables.
       */
      mockPasswordGenerator.mockReturnValueOnce("Alice@Dtrs.Mango4242");

      const client = makeClient();
      const { result } = renderHook(() => useDirectResetStep(USER), {
        wrapper: makeWrapper(client),
      });

      // Trigger the empty-password error.
      act(() => {
        result.current.handleDirectSubmit();
      });
      expect(result.current.directErrors.password).toBe("New password is required.");

      // Click "Generate password" — this should clear the error.
      act(() => {
        result.current.handleGeneratePassword();
      });
      expect(result.current.directErrors.password).toBeUndefined();
      expect(result.current.directErrors.confirmPassword).toBeUndefined();

      client.clear();
    });
  });

  describe("generate password", () => {
    it("fills both password fields with the generated value", () => {
      /*
       * "Generate password" produces a strong temp password, fills both
       * fields, and clears any prior errors. The generated password should
       * be long enough (≥ 8 chars) so validation passes immediately.
       */
      mockPasswordGenerator.mockReturnValueOnce("Alice@Dtrs.Mango4242");

      const client = makeClient();
      const { result } = renderHook(() => useDirectResetStep(USER), {
        wrapper: makeWrapper(client),
      });

      act(() => {
        result.current.handleGeneratePassword();
      });

      expect(mockPasswordGenerator).toHaveBeenCalledWith(USER.name);
      expect(result.current.directForm.password).toBe("Alice@Dtrs.Mango4242");
      expect(result.current.directForm.confirmPassword).toBe("Alice@Dtrs.Mango4242");
      expect(result.current.directErrors.password).toBeUndefined();
      expect(result.current.directErrors.confirmPassword).toBeUndefined();

      client.clear();
    });
  });

  describe("submission", () => {
    it("calls userService.updatePassword with the user id and new password on success", async () => {
      mockUpdatePassword.mockResolvedValueOnce(undefined);

      const client = makeClient();
      const { result } = renderHook(() => useDirectResetStep(USER), {
        wrapper: makeWrapper(client),
      });

      act(() => {
        result.current.setDirectForm({
          password: "new-password-123",
          confirmPassword: "new-password-123",
        });
      });

      await act(async () => {
        result.current.handleDirectSubmit();
      });

      await waitFor(() => expect(result.current.resetComplete).toBe(true));

      expect(mockUpdatePassword).toHaveBeenCalledWith({
        user_id: USER.id,
        password: "new-password-123",
      });
      expect(mockToast.success).toHaveBeenCalledWith("Password reset for Alice Reyes.");

      client.clear();
    });

    it("isResetting is true during the mutation", async () => {
      /*
       * While the password reset is in flight the "Reset Password" button
       * shows "Resetting…" and is disabled (isResetting drives both).
       *
       * React Query v5 schedules state notifications via setTimeout(0)
       * (a macrotask), so we use vi.useFakeTimers() and advanceTimersByTime
       * to flush the notification within act().
       */
      vi.useFakeTimers();

      let resolveReset!: () => void;
      const pending = new Promise<void>((resolve) => {
        resolveReset = resolve;
      });
      mockUpdatePassword.mockReturnValueOnce(pending);

      const client = makeClient();
      const { result } = renderHook(() => useDirectResetStep(USER), {
        wrapper: makeWrapper(client),
      });

      act(() => {
        result.current.setDirectForm({
          password: "new-password-123",
          confirmPassword: "new-password-123",
        });
      });

      act(() => {
        result.current.handleDirectSubmit();
      });

      // Flush React Query's setTimeout(0) notification
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.isResetting).toBe(true);

      await act(async () => {
        resolveReset();
        vi.advanceTimersByTime(10);
      });

      expect(result.current.isResetting).toBe(false);

      client.clear();
    });

    it("does NOT mark resetComplete when the password update fails", async () => {
      /*
       * On a 400/500 the mutation rejects. The hook sets an inline error on
       * the password field (NO toast — the error is field-level), and
       * resetComplete stays false so the form stays open for retry.
       */
      mockUpdatePassword.mockRejectedValueOnce(axiosError(500, "Internal server error"));

      const client = makeClient();
      const { result } = renderHook(() => useDirectResetStep(USER), {
        wrapper: makeWrapper(client),
      });

      act(() => {
        result.current.setDirectForm({
          password: "new-password-123",
          confirmPassword: "new-password-123",
        });
      });

      await act(async () => {
        result.current.handleDirectSubmit();
      });

      await waitFor(() => expect(result.current.isResetting).toBe(false));

      expect(result.current.resetComplete).toBe(false);
      expect(result.current.directErrors.password).toBe("Internal server error");

      client.clear();
    });

    it("uses the fallback message when the error has no server message", async () => {
      mockUpdatePassword.mockRejectedValueOnce(new Error("Network failure"));

      const client = makeClient();
      const { result } = renderHook(() => useDirectResetStep(USER), {
        wrapper: makeWrapper(client),
      });

      act(() => {
        result.current.setDirectForm({
          password: "new-password-123",
          confirmPassword: "new-password-123",
        });
      });

      await act(async () => {
        result.current.handleDirectSubmit();
      });

      await waitFor(() => expect(result.current.isResetting).toBe(false));
      expect(result.current.directErrors.password).toBe("Could not reset the password.");
      expect(result.current.resetComplete).toBe(false);

      client.clear();
    });
  });

  describe("resetComplete state", () => {
    it("starts false and becomes true only after a successful mutation", () => {
      const client = makeClient();
      const { result } = renderHook(() => useDirectResetStep(USER), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.resetComplete).toBe(false);
      client.clear();
    });
  });
});

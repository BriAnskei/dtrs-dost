/**
 * Tests for `useResetPasswordModal` — the orchestration hook that drives the
 * entire reset-password modal's multi-step flow:
 *
 *   verify → method → [direct | link | conflict → resolve → retry]
 *
 * WHY THIS HOOK MATTERS:
 *   It wires together the sub-hooks (`useVerifyPasswordStep`,
 *   `useChooseMethodStep`, `useDirectResetStep`, `useLinkResetStep`,
 *   `useTokenConflictStep`) into a single state machine with step transitions,
 *   a goBack navigation stack, a close guard (don't close while discarding a
 *   link), and conflict resolution via token deletion + method retry.
 *
 * WHAT WE MOCK (service layer — the real sub-hooks run end-to-end):
 *   - `passwordResetService` — getByUserId, createResetRequest, deleteToken
 *   - `userService` — updatePassword
 *   - `authenticationService` — verifyPassword
 *   - `getConflictBody` (from password-reset.service) — 409 body extraction
 *   - `getErrorMessage` (from lib/api-error) — left as pure impl
 *   - `passwordGenerator` — deterministic temp password
 *   - `sonner` (toast) — assert user-facing messages
 *
 * react-query runs through a real QueryClient (retry=false) so the full
 * mutation chain (verify → selectMethod → createResetRequest) resolves
 * naturally across sub-hooks.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useResetPasswordModal,
  type ResetPasswordStep,
} from "./use-reset-password-modal";
import type { SystemUser } from "../../types/user.type";
import type { PasswordResetRequestResponse, PasswordResetTokenSummary } from "../../types/password-reset.type";

const {
  mockVerifyPassword,
  mockGetByUserId,
  mockCreateResetRequest,
  mockDeleteToken,
  mockUpdatePassword,
  mockPasswordGenerator,
  mockToast,
} = vi.hoisted(() => ({
  mockVerifyPassword: vi.fn(),
  mockGetByUserId: vi.fn(),
  mockCreateResetRequest: vi.fn(),
  mockDeleteToken: vi.fn(),
  mockUpdatePassword: vi.fn(),
  mockPasswordGenerator: vi.fn(),
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("../../services/password-reset.service", () => ({
  passwordResetService: {
    getByUserId: mockGetByUserId,
    createResetRequest: mockCreateResetRequest,
    deletePasswordResetToken: mockDeleteToken,
  },
  getConflictBody: vi.fn(),
}));

vi.mock("../../services/user.service", () => ({
  userService: { updatePassword: mockUpdatePassword },
}));

vi.mock("../../../authentication/service/authentication.service", () => ({
  authenticationService: { verifyPassword: mockVerifyPassword },
}));

// `getErrorMessage` and `getApiErrorMessage` are pure functions — let them run real.
// (Removed mock that incorrectly returned err.message for plain Errors.)

vi.mock("../../utils/passwordGenerator", () => ({
  passwordGenerator: mockPasswordGenerator,
}));

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

const ADMIN_PASSWORD = "admin-secret-123";

const LINK_RESPONSE: PasswordResetRequestResponse = {
  id: "link-token-1",
  token: "abc123reset-token",
  expires_at: "2025-12-31T23:59:59.000Z",
};

const EXISTING_TOKEN: PasswordResetTokenSummary = {
  id: "existing-token-1",
  user_id: USER.id,
  expires_at: "2025-12-31T23:59:59.000Z",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/**
 * Render the hook and advance through the verify step so the modal is at
 * step="method" — the starting point for all method-selection tests.
 */
async function renderAndVerify(client: QueryClient, onClose: () => void) {
  const { result } = renderHook(() => useResetPasswordModal(USER, onClose), {
    wrapper: makeWrapper(client),
  });

  act(() => {
    result.current.setAdminPassword(ADMIN_PASSWORD);
  });
  mockVerifyPassword.mockResolvedValueOnce({ verified: true });
  await act(async () => {
    result.current.handleVerifyPassword();
  });
  await waitFor(() => expect(result.current.step).toBe("method"));

  return { result };
}

/**
 * Full setup: verify → method → selectMethod("link") with no existing token → link.
 * Used by tests that need the "link" step with linkData populated.
 */
async function renderAndNavigateToLink(client: QueryClient, onClose: () => void) {
  const { result } = await renderAndVerify(client, onClose);

  mockGetByUserId.mockResolvedValueOnce(null);
  mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);

  await act(async () => {
    await result.current.selectMethod("link");
  });
  await waitFor(() => expect(result.current.step).toBe("link"));

  return { result };
}

/**
 * Full setup: verify → method → selectMethod("link") with EXISTING token → conflict.
 */
async function renderAndNavigateToConflict(client: QueryClient, onClose: () => void) {
  const { result } = await renderAndVerify(client, onClose);

  mockGetByUserId.mockResolvedValueOnce(EXISTING_TOKEN);

  await act(async () => {
    await result.current.selectMethod("link");
  });
  await waitFor(() => expect(result.current.step).toBe("conflict"));

  return { result };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useResetPasswordModal", () => {
  beforeEach(() => {
    mockVerifyPassword.mockReset();
    mockGetByUserId.mockReset();
    mockCreateResetRequest.mockReset();
    mockDeleteToken.mockReset();
    mockUpdatePassword.mockReset();
    mockPasswordGenerator.mockReset();
    mockToast.success.mockReset();
    mockToast.error.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initial state", () => {
    it("starts at the 'verify' step with no method or conflict info", () => {
      const client = makeClient();
      const onClose = vi.fn();
      const { result } = renderHook(() => useResetPasswordModal(USER, onClose), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.step).toBe("verify");
      expect(result.current.method).toBeNull();
      expect(result.current.conflictInfo).toBeNull();
      expect(result.current.user).toEqual(USER);

      client.clear();
    });

    it("initially isNavigatingBack is false (no abandonment in progress)", () => {
      const client = makeClient();
      const { result } = renderHook(() => useResetPasswordModal(USER, vi.fn()), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.isNavigatingBack).toBe(false);

      client.clear();
    });
  });

  describe("verify step", () => {
    it("advances to 'method' step after a successful password verification", async () => {
      /*
       * The admin enters their password, handleVerifyPassword fires the
       * verifyPassword mutation, and onSuccess(() => setStep("method"))
       * transitions the flow.
       */
      const client = makeClient();
      mockVerifyPassword.mockResolvedValueOnce({ verified: true });

      const { result } = renderHook(() => useResetPasswordModal(USER, vi.fn()), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.step).toBe("verify");

      act(() => result.current.setAdminPassword(ADMIN_PASSWORD));
      await act(async () => result.current.handleVerifyPassword());

      await waitFor(() => expect(result.current.step).toBe("method"));
      client.clear();
    });

    it("blocks verification with an inline error when password is empty", () => {
      /*
       * No password entered → the hook sets adminPasswordError inline and
       * does NOT call authenticationService.verifyPassword.
       */
      const client = makeClient();
      const { result } = renderHook(() => useResetPasswordModal(USER, vi.fn()), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.handleVerifyPassword());

      expect(mockVerifyPassword).not.toHaveBeenCalled();
      expect(result.current.adminPasswordError).toBe("Enter your password to continue.");
      expect(result.current.step).toBe("verify");

      client.clear();
    });

    it("shows inline error and stays at 'verify' when verification fails", async () => {
      /*
       * The backend rejects (e.g. wrong admin password). The hook sets
       * adminPasswordError via getErrorMessage and the step stays "verify".
       */
      mockVerifyPassword.mockRejectedValueOnce(new Error("Incorrect password."));

      const client = makeClient();
      const { result } = renderHook(() => useResetPasswordModal(USER, vi.fn()), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setAdminPassword("wrong"));
      await act(async () => result.current.handleVerifyPassword());

      await waitFor(() => expect(result.current.adminPasswordError).toBe("Incorrect password."));
      expect(result.current.step).toBe("verify");
      expect(result.current.isVerifying).toBe(false);

      client.clear();
    });

    it("isVerifying is true during the mutation, false after", async () => {
      /*
       * The VerifyPasswordStep component shows "Verifying…" on the button
       * while isVerifying is true.
       */
      let resolveVerify!: (value: { verified: boolean }) => void;
      mockVerifyPassword.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveVerify = resolve;
        }),
      );

      const client = makeClient();
      const { result } = renderHook(() => useResetPasswordModal(USER, vi.fn()), {
        wrapper: makeWrapper(client),
      });

      act(() => result.current.setAdminPassword(ADMIN_PASSWORD));

      act(() => {
        result.current.handleVerifyPassword();
      });

      expect(result.current.isVerifying).toBe(true);

      await act(async () => {
        resolveVerify({ verified: true });
      });

      await waitFor(() => expect(result.current.isVerifying).toBe(false));
      expect(result.current.step).toBe("method");

      client.clear();
    });

    it("clears the inline error when the admin re-types their password", async () => {
      /*
       * After an empty-password error, re-typing and re-submitting clears the
       * error (handleVerifyPassword calls setAdminPasswordError(undefined) before
       * dispatching the mutation). setAdminPassword alone does NOT clear errors —
       * only handleVerifyPassword does.
       */
      const client = makeClient();
      const { result } = renderHook(() => useResetPasswordModal(USER, vi.fn()), {
        wrapper: makeWrapper(client),
      });

      // Trigger the empty-password error.
      act(() => result.current.handleVerifyPassword());
      expect(result.current.adminPasswordError).toBe("Enter your password to continue.");

      // Re-type with a non-empty password and re-verify.
      // MUST be separate act() blocks: handleVerifyPassword reads adminPassword
      // synchronously, so setAdminPassword must complete (re-render) first.
      // Batching both in one act means handleVerifyPassword sees the OLD (empty)
      // value and re-sets the error instead of clearing it.
      mockVerifyPassword.mockResolvedValueOnce({ verified: true });
      act(() => {
        result.current.setAdminPassword("new-value");
      });
      act(() => {
        result.current.handleVerifyPassword();
      });

      expect(result.current.adminPasswordError).toBeUndefined();

      client.clear();
    });
  });

  describe("method selection", () => {
    it('"direct" with no existing token → step="direct", method="direct"', async () => {
      /*
       * No existing reset token → onDirectReady fires → setMethod("direct"),
       * setStep("direct"). The admin goes to the password form.
       */
      const client = makeClient();
      const { result } = await renderAndVerify(client, vi.fn());

      mockGetByUserId.mockResolvedValueOnce(null);

      await act(async () => {
        await result.current.selectMethod("direct");
      });

      expect(result.current.step).toBe("direct");
      expect(result.current.method).toBe("direct");
      expect(mockCreateResetRequest).not.toHaveBeenCalled();

      client.clear();
    });

    it('"link" with no existing token → step="link", method="link"', async () => {
      /*
       * No existing token → proceedWithMethod("link") → createResetRequest
       * resolves → onLinkCreated(data) → setMethod("link"), setLinkData(data),
       * setStep("link"). The admin sees the QR code / reset link.
       */
      const client = makeClient();
      const { result } = await renderAndVerify(client, vi.fn());

      mockGetByUserId.mockResolvedValueOnce(null);
      mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);

      await act(async () => {
        await result.current.selectMethod("link");
      });

      await waitFor(() => expect(result.current.step).toBe("link"));
      expect(result.current.method).toBe("link");
      expect(result.current.linkData).toEqual(LINK_RESPONSE);

      client.clear();
    });

    it('"link" with existing token → step="conflict"', async () => {
      /*
       * An existing reset token is found → onExistingTokenFound fires →
       * setConflictInfo({ existing, pendingMethod: "link" }), setStep("conflict").
       * The admin sees the "reset already pending" message.
       */
      const client = makeClient();
      const { result } = await renderAndVerify(client, vi.fn());

      mockGetByUserId.mockResolvedValueOnce(EXISTING_TOKEN);

      await act(async () => {
        await result.current.selectMethod("link");
      });

      expect(result.current.step).toBe("conflict");
      expect(result.current.conflictInfo).toEqual({
        existing: EXISTING_TOKEN,
        pendingMethod: "link",
      });
      expect(mockCreateResetRequest).not.toHaveBeenCalled();

      client.clear();
    });

    it('"direct" with existing token → step="conflict" (conflict check is route-agnostic)', async () => {
      /*
       * Even choosing "direct" triggers the existence check first — if a token
       * is already pending, the conflict step fires regardless of the method.
       */
      const client = makeClient();
      const { result } = await renderAndVerify(client, vi.fn());

      mockGetByUserId.mockResolvedValueOnce(EXISTING_TOKEN);

      await act(async () => {
        await result.current.selectMethod("direct");
      });

      expect(result.current.step).toBe("conflict");
      expect(result.current.conflictInfo?.pendingMethod).toBe("direct");

      client.clear();
    });
  });

  describe("conflict resolution", () => {
    it("resolves conflict → retry link method → step='link'", async () => {
      /*
       * Full chain: the existing token is deleted → onResolved("link") →
       * proceedWithMethod("link") → createResetRequest → onLinkCreated →
       * step="link" with fresh linkData.
       */
      const client = makeClient();
      const { result } = await renderAndNavigateToConflict(client, vi.fn());

      // Resolve the conflict: delete + create new link
      mockDeleteToken.mockResolvedValueOnce(undefined);
      mockGetByUserId.mockResolvedValueOnce(null);
      mockCreateResetRequest.mockResolvedValueOnce(LINK_RESPONSE);

      await act(async () => {
        result.current.resolveConflict();
      });

      await waitFor(() => expect(result.current.step).toBe("link"));
      expect(result.current.conflictInfo).toBeNull();
      expect(result.current.method).toBe("link");
      expect(result.current.linkData).toEqual(LINK_RESPONSE);

      client.clear();
    });

    it("resolves conflict → retry direct method → step='direct'", async () => {
      /*
       * The conflict might have been triggered for "direct" method too.
       * After resolving, proceedWithMethod("direct") → onDirectReady →
       * step="direct", no createResetRequest needed.
       */
      const client = makeClient();
      const { result } = await renderAndVerify(client, vi.fn());

      // Trigger conflict with "direct" method
      mockGetByUserId.mockResolvedValueOnce(EXISTING_TOKEN);
      await act(async () => {
        await result.current.selectMethod("direct");
      });
      expect(result.current.step).toBe("conflict");

      // Resolve conflict
      mockDeleteToken.mockResolvedValueOnce(undefined);
      mockGetByUserId.mockResolvedValueOnce(null); // proceedWithMethod doesn't check again, but createLinkMutation might

      await act(async () => {
        result.current.resolveConflict();
      });

      await waitFor(() => expect(result.current.step).toBe("direct"));
      expect(result.current.conflictInfo).toBeNull();
      expect(result.current.method).toBe("direct");

      client.clear();
    });

    it("isResolvingConflict is true during token deletion", async () => {
      /*
       * While the conflicting token is being deleted, the UI shows
       * "Cancelling…" and the button is disabled.
       */
      const client = makeClient();
      const { result } = await renderAndNavigateToConflict(client, vi.fn());

      let resolveDelete!: () => void;
      mockDeleteToken.mockReturnValueOnce(new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }));

      act(() => {
        result.current.resolveConflict();
      });

      await waitFor(() => expect(result.current.isResolvingConflict).toBe(true));

      await act(async () => {
        resolveDelete();
      });

      await waitFor(() => expect(result.current.isResolvingConflict).toBe(false));

      client.clear();
    });

    it("stays at conflict step when deletion fails (no onResolved)", async () => {
      /*
       * If the token deletion itself fails, the conflict step stays open
       * and an error toast is shown — the admin can retry.
       */
      const client = makeClient();
      const { result } = await renderAndNavigateToConflict(client, vi.fn());

      mockDeleteToken.mockRejectedValueOnce(new Error("Could not cancel reset request."));

      await act(async () => {
        result.current.resolveConflict();
      });

      await waitFor(() => expect(mockToast.error).toHaveBeenCalledTimes(1));
      // getErrorMessage is REAL here: for a plain Error it returns the fallback
      // "Could not cancel the existing reset request." (not err.message).
      expect(mockToast.error).toHaveBeenCalledWith("Could not cancel the existing reset request.");
      // Still at conflict step, conflictInfo not cleared.
      expect(result.current.step).toBe("conflict");
      expect(result.current.conflictInfo).not.toBeNull();

      client.clear();
    });
  });

  describe("goBack", () => {
    it('from "method" → "verify"', async () => {
      const client = makeClient();
      const { result } = await renderAndVerify(client, vi.fn());

      expect(result.current.step).toBe("method");

      await act(async () => {
        await result.current.goBack();
      });

      expect(result.current.step).toBe("verify");

      client.clear();
    });

    it('from "direct" → "method"', async () => {
      const client = makeClient();
      const { result } = await renderAndVerify(client, vi.fn());

      mockGetByUserId.mockResolvedValueOnce(null);
      await act(async () => {
        await result.current.selectMethod("direct");
      });
      expect(result.current.step).toBe("direct");

      await act(async () => {
        await result.current.goBack();
      });

      expect(result.current.step).toBe("method");

      client.clear();
    });

    it('from "conflict" → "method" (clears conflictInfo)', async () => {
      const client = makeClient();
      const { result } = await renderAndNavigateToConflict(client, vi.fn());

      expect(result.current.step).toBe("conflict");
      expect(result.current.conflictInfo).not.toBeNull();

      await act(async () => {
        await result.current.goBack();
      });

      expect(result.current.step).toBe("method");
      expect(result.current.conflictInfo).toBeNull();

      client.clear();
    });

    it('from "link" → abandon link → "method"', async () => {
      /*
       * goBack from the link step calls link.abandon() (which deletes the
       * token), then transitions to "method".
       */
      const client = makeClient();
      const { result } = await renderAndNavigateToLink(client, vi.fn());

      expect(result.current.step).toBe("link");
      expect(result.current.linkData).toEqual(LINK_RESPONSE);

      mockDeleteToken.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.goBack();
      });

      await waitFor(() => expect(result.current.step).toBe("method"));
      expect(result.current.linkData).toBeNull();

      client.clear();
    });

    it('does NOT navigate from "link" while isAbandoningLink is true', async () => {
      /*
       * If the admin clicks "Back" while the link is being discarded,
       * goBack returns early — preventing a double-abandon race. The step
       * stays "link" until abandonment finishes, at which point goBack can
       * proceed.
       */
      const client = makeClient();
      const { result } = await renderAndNavigateToLink(client, vi.fn());

      let resolveDelete!: () => void;
      mockDeleteToken.mockReturnValueOnce(new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }));

      // Start abandon and wait for isAbandoningLink to be true
      let abandonPromise: Promise<void> | undefined;
      await act(async () => {
        abandonPromise = result.current.abandon();
      });
      await waitFor(() => expect(result.current.isAbandoningLink).toBe(true));

      // goBack should be a no-op while abandoning
      await act(async () => {
        await result.current.goBack();
      });
      expect(result.current.step).toBe("link");

      // Resolve the abandon
      await act(async () => {
        resolveDelete();
        await abandonPromise;
      });
      // After abandonment, isAbandoningLink is false but goBack already
      // returned early — the step is still "link" until goBack is called again.
      expect(result.current.isAbandoningLink).toBe(false);

      // Now goBack should work — abandon is complete, linkData cleared.
      await act(async () => {
        await result.current.goBack();
      });
      expect(result.current.step).toBe("method");

      client.clear();
    });
  });

  describe("handleClose", () => {
    it("calls onClose when on any step except link-abandoning", () => {
      /*
       * On the "method" step (no abandonment in progress), clicking the
       * close button or backdrop calls onClose so the parent can unmount.
       */
      const client = makeClient();
      mockVerifyPassword.mockResolvedValueOnce({ verified: true });

      const onClose = vi.fn();
      const { result } = renderHook(() => useResetPasswordModal(USER, onClose), {
        wrapper: makeWrapper(client),
      });

      // Stay at "verify" — handleClose should still work.
      act(() => result.current.handleClose());
      expect(onClose).toHaveBeenCalledTimes(1);

      client.clear();
    });

    it("does NOT call onClose while a link is being abandoned", async () => {
      /*
       * The modal close button and backdrop are guarded: if the admin is on
       * the "link" step and abandon() is in flight (deleting the token), the
       * modal must NOT close — otherwise the link is left dangling. After
       * abandonment finishes, the guard releases and handleClose can close.
       */
      const client = makeClient();
      const onClose = vi.fn();
      const { result } = await renderAndNavigateToLink(client, onClose);

      // Start abandon with a pending delete
      let resolveDelete!: () => void;
      mockDeleteToken.mockReturnValueOnce(new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }));

      let abandonPromise: Promise<void> | undefined;
      await act(async () => {
        abandonPromise = result.current.abandon();
      });
      await waitFor(() => expect(result.current.isAbandoningLink).toBe(true));

      // handleClose should NOT fire onClose while abandoning
      act(() => {
        result.current.handleClose();
      });
      expect(onClose).not.toHaveBeenCalled();

      // Once abandonment completes, the guard releases (isAbandoningLink=false).
      // handleClose checks `step === "link" && link.isAbandoningLink` — since
      // isAbandoningLink is now false, the guard passes and onClose fires.
      await act(async () => {
        resolveDelete();
        await abandonPromise;
      });
      expect(result.current.isAbandoningLink).toBe(false);

      act(() => {
        result.current.handleClose();
      });
      expect(onClose).toHaveBeenCalledTimes(1);

      client.clear();
    });
  });

  describe("isNavigatingBack", () => {
    it("is false when not abandoning", () => {
      /*
       * isNavigatingBack is a passthrough to link.isAbandoningLink.
       * When no abandonment is in progress, it's false — the footer shows
       * the normal "Back" button.
       */
      const client = makeClient();
      const { result } = renderHook(() => useResetPasswordModal(USER, vi.fn()), {
        wrapper: makeWrapper(client),
      });

      expect(result.current.isNavigatingBack).toBe(false);

      client.clear();
    });

    it("is true while a link is being abandoned", async () => {
      const client = makeClient();
      const { result } = await renderAndNavigateToLink(client, vi.fn());

      let resolveDelete!: () => void;
      mockDeleteToken.mockReturnValueOnce(new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }));

      await act(async () => {
        result.current.abandon();
      });
      await waitFor(() => expect(result.current.isNavigatingBack).toBe(true));

      await act(async () => {
        resolveDelete();
      });
      await waitFor(() => expect(result.current.isNavigatingBack).toBe(false));

      client.clear();
    });
  });

  describe("isCheckingMethod", () => {
    it("reflects chooseMethod.isCheckingMethod during selectMethod", async () => {
      /*
       * While getByUserId is in flight, isCheckingMethod is true — the method
       * buttons show "Checking…" spinner.
       */
      const client = makeClient();
      const { result } = await renderAndVerify(client, vi.fn());

      let resolveGet!: (value: PasswordResetTokenSummary | null) => void;
      mockGetByUserId.mockReturnValueOnce(
        new Promise<PasswordResetTokenSummary | null>((resolve) => {
          resolveGet = resolve;
        }),
      );

      void act(async () => {
        result.current.selectMethod("direct");
      });

      await waitFor(() => expect(result.current.isCheckingMethod).toBe(true));

      await act(async () => {
        resolveGet(null);
      });

      await waitFor(() => expect(result.current.isCheckingMethod).toBe(false));
      expect(result.current.step).toBe("direct");

      client.clear();
    });
  });
});
